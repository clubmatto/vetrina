export function filterByTag(posts, tag) {
  return posts.filter(
    (post) => post.data.tags && post.data.tags.includes(tag),
  );
}
