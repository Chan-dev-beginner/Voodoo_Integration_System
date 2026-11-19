<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars(APP_TITLE) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Oxanium:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <section class="login-screen" id="loginScreen">
    <div class="login-card">
      <div class="login-brand"><span>Voodoo</span><strong>ESports Cafe</strong></div>
      <h1>Welcome back</h1><p>Sign in to your management system</p>
      <form id="loginForm">
        <label>Username<input id="username" value="admin" autocomplete="username" required></label>
        <label>Password<div class="password"><input id="password" type="password" value="admin" autocomplete="current-password" required><button type="button" id="togglePassword">◉</button></div></label>
        <label>Account<select id="loginAccount"><option value="admin">Admin</option><option value="barista">Barista</option></select></label>
        <p id="accountHint" class="login-hint">Admin: admin / admin</p>
        <button class="login-button" type="submit">Sign in <span>→</span></button>
      </form>
    </div>
  </section>

  <div class="app-shell hidden" id="appShell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-kicker">Voodoo</span><strong>ESports Cafe</strong></div>
      <nav class="side-nav" id="sideNav" aria-label="Main navigation"></nav>
      <div class="sidebar-footer"><button class="staff" id="logoutButton" type="button"><span class="avatar">A</span><span><strong id="staffName">Admin</strong><small>Sign out</small></span></button></div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div><p class="page-label" id="pageLabel">Point of sale</p><h1 id="pageTitle">Dashboard</h1></div>
        <div class="top-actions"><button class="clock" id="clock" type="button">--:-- --</button><button class="icon-action" type="button" aria-label="Notifications">●<span></span></button><button class="primary-action" id="primaryAction" type="button">＋ New Order</button></div>
      </header>
      <div id="viewContainer" class="view-container"></div>
    </main>
  </div>

  <div class="toast" id="toast" role="status"></div>
  <div id="actionModal"></div>
  <script src="Model/AppModel.js?v=20261120-NEW"></script>
  <script src="View/AppView.js?v=20261120-NEW"></script>
  <script src="Controller/AppController.js?v=20261120-NEW"></script>
  <script src="Controller/AppBootstrap.js?v=20261120-NEW"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</body>
</html>
