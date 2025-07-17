export default {
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true }
  },
  template: `
    <ul class="ml-4 list-disc">
      <li>
        <span class="text-white">{{ node.text }}</span>
        <template v-if="node.children && node.children.length">
          <TreeNode v-for="(child, idx) in node.children" :key="idx" :node="child" />
        </template>
      </li>
    </ul>
  `
}
