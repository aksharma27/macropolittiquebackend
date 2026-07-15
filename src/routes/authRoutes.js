import express from 'express';
import {
    // getApprovalByAdmin
    //editPostByAdmin
    //createPostByAdmin
    //deletePostByAdmin
} from '../controller/postcontroller.js';
import {
    login,
    logout,
    getMe,
    registerUser,
    forgotPassword,
    resetPassword
} from '../controller/auth.js';

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', getMe);
authRouter.post('/register', registerUser);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

export default authRouter;