import { changePasswordAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ChangePasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Đổi mật khẩu bắt buộc</h1>
        <p>Mật khẩu mới phải có tối thiểu 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt. Không được dùng lại mật khẩu tạm.</p>
        {error ? <div className="alert">{decodeURIComponent(error)}</div> : null}
        <form action={changePasswordAction} className="form-grid">
          <div className="field">
            <label htmlFor="password">Mật khẩu mới</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>
          <button className="btn primary" type="submit">Lưu mật khẩu mới</button>
        </form>
      </section>
    </main>
  );
}
