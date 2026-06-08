export function posts(collectionApi) {
  return collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .sort((a, b) => {
      return b.date - a.date;
    });
}

export function postsByYear(collectionApi) {
  const posts = collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .sort((a, b) => {
      return b.date - a.date;
    });

  const grouped = {};
  posts.forEach((post) => {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();

    if (!grouped[year]) {
      grouped[year] = [];
    }

    grouped[year].push({
      postUrl: post.data.page.url,
      title: post.data.title,
      formattedDate: `${month} ${day}`,
      tags: post.data.tags,
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => b - a)
    .map((year) => ({
      year: year,
      posts: grouped[year],
    }));
}
