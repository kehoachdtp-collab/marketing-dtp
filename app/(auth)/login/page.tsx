import { loginAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Đăng nhập</h1>
        <p>MKT Dashboard nội bộ. Tài khoản bị khóa/inactive sẽ không được vào hệ thống.</p>
        {error ? <div className="alert">{decodeURIComponent(error)}</div> : null}
        <form action={loginAction} className="form-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn primary" type="submit">Đăng nhập</button>
        </form>
      </section>
    </main>
  );
}
