import Home from './pages/Home.js';

const routes = [
    { path: '/', component: Home },
];

export const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes
});
