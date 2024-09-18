module.exports = function (io) {
    const classSessions = {}; 

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('join', ({ classId, userData, isInstructor }) => {
            socket.join(classId);

            if (!classSessions[classId]) {
                classSessions[classId] = {
                    accessRequests: [],
                    approvedUsers: new Set(),
                    connectedUsers: {},
                    instructors: new Set(),
                    editorContent: '',
                    showCompiler: false,
                    currentLanguage: 'javascript',
                    outputContent: '',
                };
            }

            const session = classSessions[classId];
            session.connectedUsers[socket.id] = {
                userData,
                hasEditAccess: isInstructor,
            };

            if (isInstructor) {
                session.instructors.add(socket.id);
                session.approvedUsers.add(socket.id);
            }

            socket.on('disconnect', () => {
                console.log('A user disconnected:', socket.id);
                session.approvedUsers.delete(socket.id);
                session.instructors.delete(socket.id);
                delete session.connectedUsers[socket.id];
                updateInstructorsUserList(classId);
            });

            function updateInstructorsUserList(classId) {
                const userList = Object.keys(session.connectedUsers).map((id) => ({
                    userId: id,
                    userData: session.connectedUsers[id].userData,
                    hasEditAccess: session.connectedUsers[id].hasEditAccess,
                }));
                session.instructors.forEach((instructorId) => {
                    io.to(instructorId).emit('user-list-update', userList);
                });
            }
        });
    });
};
