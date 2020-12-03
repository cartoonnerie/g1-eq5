process.env.NODE_ENV = 'test';

const assert = require('assert');
const dbConfig = require('../../../config/db');
const backlogService = require('../../../src/services/backlogService');
const taskService = require('../../../src/services/taskService');
const Task = require('../../../src/models/task');
const Backlog = require('../../../src/models/backlog');
const Project = require('../../../src/models/project');
const UserStory = require('../../../src/models/userStory');
const Developer = require('../../../src/models/developer');

function testCatchAddTask(done, project, type, name, description, userStory, time, dependency){
    taskService.addTask(project, type, name, description, userStory, time, dependency)
        .catch(() => {
            Task.countDocuments((err, count) => {
                assert.deepStrictEqual(count, 0);
                done();
            });
        });
}

function testThenAddTask(done, project, type, name, description, userStory, time, dependency){
    taskService.addTask(project, type, name, description, userStory, time, dependency)
        .then((data) => {
            assert(!data.isNew);
            Task.countDocuments((err, count) => {
                assert.deepStrictEqual(count, 1);
                done();
            });
        });
}

function checkTask(actual, expected) {
    assert.deepStrictEqual(actual.name, expected.name);
    assert.deepStrictEqual(actual.description, expected.description);
    assert.deepStrictEqual(actual.userStoryID, expected.userStoryID);
    assert.deepStrictEqual(actual.timeEstimation, expected.timeEstimation);
    // assert.deepStrictEqual(task.dependency, newDependency); TODO
}

function addDeveloperTask(task){
    return new Promise((resolve) => {
        const developer = new Developer({username: 'username'});
        developer.save().then(() => {
            task.assignee = developer;
            resolve(task.save());
        });
    });
}

describe('Tasks service', () => {
    const type = 2;
    const backlog = new Backlog({sprints:[], userStories:[]});
    const name = 'mochaTasktest';
    const description = 'Une description test';
    const time = 1;
    const dependency = '';

    const expectedTask = {
        name: name,
        description: description,
        timeEstimation: time,
        userStoryID: '',
        dependency: dependency
    };

    let project;
    let userStory;

    before('connect', function(){
        dbConfig.connectToDB();
    });

    beforeEach('empty db', async () => {
        await Task.deleteMany({});
        await UserStory.deleteMany({});
        await Project.deleteMany({});

        project = new Project({ name: 'mochatest', key: 'MTES', backlog: backlog, tasks: []});
        await project.save();
        userStory = await backlogService.addUserStory(project, 'first US');
        expectedTask.userStoryID = userStory._id;
    });

    describe('TTES-39 Create Task', () => {

        it('cannot add an empty task', (done) => {
            testCatchAddTask(done, null, null, null, null, null, null, null);
        });
        it('cannot add a task with no project', (done) => {
            testCatchAddTask(done, null, type, name, description, userStory, time, null);
        });
        it('cannot add a task with no type', (done) => {
            testCatchAddTask(done, project, null, name, description, userStory, time, null);
        });
        it('cannot add a task with no name', (done) => {
            testCatchAddTask(done, project, type, null, description, userStory, time, null);
        });
        it('cannot add a task with no userStory', (done) => {
            testCatchAddTask(done, project, type, name, description, null, time, null);
        });
        it('creates a task with no time', (done) => {
            testThenAddTask(done, project, type, name, description, userStory, null, null);
        });
        it('creates a task with out description', (done) => {
            testThenAddTask(done, project, type, name, null, userStory, time, null);
        });
        it('creates a task', (done) => {
            testThenAddTask(done, project, type, name, description, userStory, time, null);
        });
    });

    describe('TTES-55', () => {
        let task;
        let newUserStory;
        beforeEach('empty db', async () => {
            task = await taskService.addTask(project, type, name, description, userStory, time);
            newUserStory = await backlogService.addUserStory(project, 'new US');
        });

        describe('Update Task', () => {
            let newName = 'newName';
            const newDescription = 'new description test';
            const newTime = 2;
            let newDependency;


            it('update a task', async () => {
                await taskService.updateTask(project, task._id, newName, newDescription, newUserStory, newTime, newDependency);
                task = await Task.findById(task._id);
                const expected = {
                    name: newName,
                    description: newDescription,
                    timeEstimation: newTime,
                    userStoryID: newUserStory._id,
                    dependency: newDependency
                };
                checkTask(task, expected);
            });

            it('cannot update a task with no project', (done) => {
                taskService.updateTask(null, task._id, newName, newDescription, newUserStory, newTime, newDependency)
                    .catch(() => {
                        Task.findById(task._id).then((savedTask) => {
                            checkTask(savedTask, expectedTask);
                            done();
                        });
                    });
            });

            it('cannot update a task with no _id', (done) => {
                taskService.updateTask(project, null, newName, newDescription, newUserStory, newTime, newDependency)
                    .catch(() => {
                        Task.findById(task._id).then((savedTask) => {
                            checkTask(savedTask, expectedTask);
                            done();
                        });
                    });
            });

            it('cannot update a task with no name', (done) => {
                taskService.updateTask(project, task._id, null, newDescription, newUserStory, newTime, newDependency)
                    .catch(() => {
                        Task.findById(task._id).then((savedTask) => {
                            checkTask(savedTask, expectedTask);
                            done();
                        });
                    });
            });

            it('cannot update a task that have a developer', (done) => {
                addDeveloperTask(task).then(() => {
                    taskService.updateTask(project, task._id, newName, newDescription, newUserStory, newTime, newDependency)
                        .catch(() => {
                            Task.findById(task._id).then((savedTask) => {
                                checkTask(savedTask, expectedTask);
                                done();
                            });
                        });
                });
            });
        });

        describe('Delete Task', () => {

            it('delete a task', async () => {
                await taskService.deleteTask(project, task._id);
                const taskCount = await Task.countDocuments();
                assert.deepStrictEqual(taskCount, 0);
            });

            it('cannot delete a task without project', (done) => {
                taskService.deleteTask(null, task._id)
                    .catch(() =>
                        Task.countDocuments().then ((count) => {
                            assert.deepStrictEqual(count, 1);
                            done();
                        }));
            });

            it('cannot delete a task without id', (done) => {
                taskService.deleteTask(project, null)
                    .catch(() =>
                        Task.countDocuments().then ((count) => {
                            assert.deepStrictEqual(count, 1);
                            done();
                        }));
            });

            it('cannot delete a task that have a developer', (done) => {
                addDeveloperTask(task).then(() => {
                    taskService.deleteTask(project, task._id)
                        .catch(() =>
                            Task.countDocuments().then ((count) => {
                                assert.deepStrictEqual(count, 1);
                                done();
                            }));
                });
            });
        });

    });
});
