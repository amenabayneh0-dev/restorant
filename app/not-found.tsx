export default function NotFound() {
  return (
    <main className="wrap" style={{ paddingTop: "20vh" }}>
      <h1>Page not found</h1>
      <p>That link isn't valid. If you were tracking an order, make sure you copied the whole link.</p>
      <a href="/" className="btn">Back to the menu</a>
    </main>
  );
}
