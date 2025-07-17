import TreeNode from './components/TreeNode.js';

export default Vue.defineComponent({
    components: { TreeNode },
    data() {
        return {
            markdownInput: '',
            parsedTree: null
        };
    },
    methods: {
        parseMarkdown() {
            // Parse Markdown outline (bulleted list) into a nested tree
            const lines = this.markdownInput.split('\n').filter(line => line.trim().length > 0);
            const root = { children: [] };
            const stack = [{ node: root, indent: -1 }];
            for (let rawLine of lines) {
                const match = rawLine.match(/^(\s*)([-*])\s+(.*)$/);
                if (!match) continue;
                const indent = match[1].length;
                const text = match[3];
                const node = { text, children: [] };
                while (stack.length && indent <= stack[stack.length - 1].indent) {
                    stack.pop();
                }
                stack[stack.length - 1].node.children.push(node);
                stack.push({ node, indent });
            }
            this.parsedTree = root.children;
        }
    },
    template: `
        <div class="min-h-screen bg-gray-900 p-4">
            <div class="max-w-5xl mx-auto bg-gray-800 rounded-lg p-6 flex flex-col md:flex-row gap-6">
                <!-- Left: Markdown Input -->
                <div class="md:w-1/2 w-full">
                    <h1 class="text-2xl font-bold text-white mb-4">Markdown Mindmap</h1>
                    <p class="text-gray-400 mb-6">Paste your Markdown outline below to generate a mind map structure.</p>
                    <textarea v-model="markdownInput" rows="12" class="w-full p-2 rounded bg-gray-700 text-white mb-4" placeholder="Enter Markdown outline..."></textarea>
                    <button @click="parseMarkdown" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Parse Markdown</button>
                </div>
                <!-- Right: Mind Map Visualization -->
                <div class="md:w-1/2 w-full bg-gray-700 rounded p-4 overflow-auto min-h-[300px]">
                    <h2 class="text-lg text-white mb-2">Mind Map Preview</h2>
                    <div v-if="parsedTree && parsedTree.length">
                        <TreeNode v-for="(node, idx) in parsedTree" :key="idx" :node="node" />
                    </div>
                    <div v-else class="text-gray-400 italic">No mind map to display yet.</div>
                </div>
            </div>
        </div>
    `
});
