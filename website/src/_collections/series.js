export function seriesPosts(collectionApi) {
  return collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .filter((post) => post.data.series)
    .sort((a, b) => a.date - b.date);
}
