document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
  const input = document.getElementById(toggle.dataset.passwordToggle);
  if (!input) return;

  toggle.addEventListener("click", () => {
    const showing = input.type === "password";
    input.type = showing ? "text" : "password";
    toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(showing));
    toggle.querySelector("img").src = showing ? "../icons/eye-off.svg" : "../icons/eye.svg";
  });
});

document.querySelectorAll("form[data-next], form[data-preview-submit]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const password = form.querySelector("[name=password]");
    const confirmation = form.querySelector("[name=confirm-password]");
    if (password && confirmation && password.value !== confirmation.value) {
      confirmation.setCustomValidity("Passwords do not match.");
      confirmation.reportValidity();
      return;
    }

    form.querySelectorAll('input[type="password"], input[type="text"][name="password"], input[type="text"][name="confirm-password"]').forEach((input) => { input.value = ""; });
    if (form.dataset.next) {
      window.location.assign(form.dataset.next);
      return;
    }

    const status = form.querySelector("#preview-status");
    if (status) status.textContent = form.dataset.previewSubmit;
  });
});

document.querySelectorAll("[name=confirm-password]").forEach((input) => {
  const clearMismatch = () => input.setCustomValidity("");
  input.addEventListener("input", clearMismatch);
  input.form.querySelector("[name=password]").addEventListener("input", clearMismatch);
});

document.querySelectorAll("[data-preview-message]").forEach((button) => {
  button.addEventListener("click", () => {
    const status = document.querySelector("#preview-status");
    if (status) status.textContent = button.dataset.previewMessage;
  });
});
