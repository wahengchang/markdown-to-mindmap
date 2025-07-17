import { router } from './router.js';

const app = Vue.createApp({
    template: `
        <div class="min-h-screen bg-gray-900">
            <router-view></router-view>
        </div>
    `
});

app.use(router);
app.mount('#app');
