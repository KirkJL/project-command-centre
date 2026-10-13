"use strict";
(() => {
  const form = document.getElementById("login-form");
  const error = document.getElementById("login-error");
  const submit = document.getElementById("login-button");
  const toggle = document.getElementById("account-mode");
  const nameLabel = document.getElementById("display-name-label");
  const name = document.getElementById("display-name");
  const password = document.getElementById("password");
  let registering = false;
  function update() {
    document.querySelector("h1").textContent = registering ? "Create your account." : "Welcome back.";
    nameLabel.hidden = !registering;
    name.required = registering;
    password.minLength = registering ? 12 : 1;
    password.maxLength = registering ? 200 : 500;
    password.autocomplete = registering ? "new-password" : "current-password";
    submit.textContent = registering ? "Create account" : "Enter Command Centre";
    toggle.textContent = registering ? "Already have an account? Sign in" : "Create an account";
  }
  toggle.addEventListener("click",()=>{registering=!registering;error.hidden=true;update();});
  form.addEventListener("submit",async event=>{
    event.preventDefault(); error.hidden=true; submit.disabled=true;toggle.disabled=true;
    submit.textContent=registering ? "Creating account?" : "Signing in?";
    const username=document.getElementById("username").value;
    try {
      if(registering) {
        await API.register({username,displayName:name.value,password:password.value});
        registering=false;
      }
      await API.login(username,password.value);
      window.location.href="./index.html";
    } catch(e) {
      const messages={INVALID_CREDENTIALS:"The username or password is incorrect.",
        USERNAME_UNAVAILABLE:"That username is already taken. Choose another or sign in.",
        REGISTRATION_CLOSED:"Account creation is closed. Please contact the workspace owner.",
        TOO_MANY_LOGIN_ATTEMPTS:"Too many attempts. Try again in 15 minutes.",
        TOO_MANY_ACCOUNT_REQUESTS:"Too many account requests. Try again in one hour.",
        USERNAME_REQUIRES_3_TO_40_LETTERS_NUMBERS:"Use 3?40 letters, numbers, dots, underscores or hyphens for your username.",
        PASSWORD_REQUIRES_12_TO_200_CHARACTERS:"Choose a password between 12 and 200 characters."};
      error.textContent=messages[e.message]||"Could not sign in. Check your connection and try again.";
      error.hidden=false;
    } finally {submit.disabled=false;toggle.disabled=false;update();}
  });
})();
