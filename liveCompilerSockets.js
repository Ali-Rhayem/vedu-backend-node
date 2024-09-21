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

            socket.emit('editor-content', session.editorContent);
            socket.emit('toggle-compiler-update', session.showCompiler);
            socket.emit('language-change', session.currentLanguage);

            updateInstructorsUserList(classId);

            socket.on('editor-update', (data) => {
                if (session.connectedUsers[socket.id]?.hasEditAccess || session.approvedUsers.has(socket.id)) {
                    session.editorContent = data.content;
                    socket.to(classId).emit('editor-update', data);
                }
            });

            socket.on('output-update', (data) => {
                session.outputContent = data.output;
                socket.to(classId).emit('output-update', data);
            });

            socket.on('toggle-compiler', (isCompilerVisible) => {
                session.showCompiler = isCompilerVisible;
                io.to(classId).emit('toggle-compiler-update', session.showCompiler);
            });

            socket.on('language-change', (newLanguage) => {
                session.currentLanguage = newLanguage;
                io.to(classId).emit('language-change', newLanguage);
            });

            socket.on('request-edit-access', (userData) => {
                session.accessRequests.push({ userId: socket.id, userData });
                session.instructors.forEach((instructorId) => {
                    io.to(instructorId).emit('access-request-update', session.accessRequests);
                });
            });

            socket.on('respond-to-request', ({ userId, approve }) => {
                if (approve) {
                    if (session.connectedUsers[userId]) {
                        session.connectedUsers[userId].hasEditAccess = true;
                    }
                    session.approvedUsers.add(userId);
                    io.to(userId).emit('access-granted');
                }
                session.accessRequests = session.accessRequests.filter((request) => request.userId !== userId);
                session.instructors.forEach((instructorId) => {
                    io.to(instructorId).emit('access-request-update', session.accessRequests);
                });
                updateInstructorsUserList(classId);
            });

            socket.on('update-user-access', ({ userId, hasEditAccess }) => {
                if (session.connectedUsers[userId]) {
                    session.connectedUsers[userId].hasEditAccess = hasEditAccess;
                    if (hasEditAccess) {
                        session.approvedUsers.add(userId);
                    } else {
                        session.approvedUsers.delete(userId);
                    }
                    io.to(userId).emit('access-updated', hasEditAccess);
                    updateInstructorsUserList(classId);
                }
            });

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
