export default function DemoLogin() {
  return (
    <form action="/api/auth/demo" method="post">
      <button className="login-action secondary" type="submit">
        Lokale Host-Demo öffnen
      </button>
    </form>
  );
}
