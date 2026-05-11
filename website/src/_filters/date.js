export function formatDate(dateObj) {
  if (!dateObj) return "";
  const date = new Date(dateObj);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}
