const UserStory = require('./../models/userStory');

function addUserStory(project, name, description) {
    return new Promise((resolve, reject) => {
        if(!project)
            reject(new Error('project parameter is required'))
        if(!name)
            reject(new Error('name parameter is required'))

        const index = project.backlog.currentUSId+1;
        let userStory = new UserStory({id:project.key + "-" +index, name:name, description:description});
        userStory.save()
        .then(() => {
            project.backlog.userStories.push(userStory);
            project.backlog.currentUSId = index;
            resolve(project.save());
        })
    })
    
}

function getBacklog(project){
    return new Promise((resolve, reject) => {
        if(!project)
            reject(new Error('project parameter is required'))
        const sprints = getSpints(project.backlog)
        getUserStories(project.backlog.userStories)
        .then(userStories => 
            resolve({
                sprints: sprints,
                userStories: userStories
            }))
    })
}

function getSpints(backlog){
    return []
}

function getUserStories(arrayId){
    return UserStory.find({_id:arrayId})
}

module.exports = {
    addUserStory,
    getBacklog,
    getUserStories
};