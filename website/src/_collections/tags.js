export function tags(collectionApi) {
  const tagsSet = new Set();
  const posts = collectionApi.getFilteredByGlob("./src/writing/**/*.md");
  posts.forEach((post) => {
    if (post.data.tags && Array.isArray(post.data.tags)) {
      post.data.tags.forEach((tag) => tagsSet.add(tag));
    }
  });
  return [...tagsSet].sort();
}
