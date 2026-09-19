import './style.css';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const email = (import.meta.env.VITE_SUPPORT_EMAIL ?? 'hrln-interactive@gmail.com').trim();
const operator = (import.meta.env.VITE_OPERATOR_NAME ?? '').trim();
const store = (import.meta.env.VITE_APP_STORE_URL ?? '').trim();
const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
const storeUrl = /^https:\/\/apps\.apple\.com\//.test(store) ? store : '';
const contact = validEmail ? `<a href="mailto:${escape(email)}">${escape(email)}</a>` : 'Our direct support contact will be available here before launch.';
const download = storeUrl ? `<a class="button" href="${escape(storeUrl)}">Download for iPhone <span aria-hidden="true">↗</span></a>` : '<span class="availability"><span aria-hidden="true">●</span> Coming soon to iPhone</span>';
const links = [['/support', 'Support'], ['/privacy', 'Privacy'], ['/terms', 'Terms']];

function tiles(word: string, className = '') {
  return `<span class="word ${className}" aria-label="${word}">${Array.from(word).map(letter => `<span class="tile" aria-hidden="true">${letter}</span>`).join('')}</span>`;
}

const home = `
  <section class="hero">
    <div class="hero-copy"><p class="eyebrow">YOUR NEXT WORD IS WAITING</p>
      <h1>A little wordplay.<br>A whole lot of<br><span>possibility.</span></h1>
      <p class="intro">Turn a handful of letters into your next little obsession. Make words, connect them, and see where your mind takes you.</p>
      ${download}
    </div>
    <div class="board-wrap"><div class="board" role="img" aria-label="An illustrated tile board with the connected words PLAY, EARS, YES and EAR">
      <span class="board-note">MAKE ROOM FOR A LITTLE PLAY</span>
      <div class="crossword" aria-hidden="true">
      ${[['P',1,1],['L',2,1],['A',3,1],['Y',4,1],['E',4,2],['S',4,3],['E',1,3],['A',2,3],['R',3,3],['A',1,4],['R',1,5]].map(([letter,col,row])=>`<span class="tile" style="grid-column:${col};grid-row:${row}">${letter}</span>`).join('')}
      </div>
      <div class="loose-tiles" aria-hidden="true">${tiles('JOY')}</div>
      <span class="board-caption">A few letters. Endless ways to play.</span>
    </div><span class="handwritten">good words, good company.</span></div>
  </section>
  <section class="modes" aria-labelledby="modes-title"><div class="section-heading"><p class="eyebrow">FIND YOUR KIND OF PLAY</p><h2 id="modes-title">One game. Your pace.</h2></div>
    <div class="mode-grid">
      <article><span class="mode-number">01 / SOLO</span><h3>A moment for yourself.</h3><p>Find your flow with a short, medium, or long game. Build a connected board and use every last tile. No sign-in needed.</p></article>
      <article><span class="mode-number">02 / PRACTICE</span><h3>A little friendly rivalry.</h3><p>Sharpen your wordplay against an AI opponent. Choose from three difficulty levels and give your vocabulary a workout.</p></article>
      <article><span class="mode-number">03 / RANKED</span><h3>Find your word people.</h3><p>Sign in, meet another player, and play for your rating. If no one is available, try a clearly marked, unranked AI game.</p></article>
    </div>
  </section>
  <section class="closing"><div>${tiles('PLAY')}<h2>Make a little space for words.</h2><p>Your next great word is already in there.</p></div>${download}</section>`;

const support = `
  <p class="eyebrow">A HELPING HAND</p><h1>Let’s sort it out.</h1><p class="intro">A question, a stuck game, or something that doesn’t look right? You’re in the right place.</p>
  <section class="contact-box"><h2>Get in touch</h2><p>${contact}</p><p>Include your app version, device model, and a short description of what happened. A screenshot can help. Please don’t send passwords or sign-in codes.</p></section>
  <h2>A few quick answers</h2>
  <div class="faq">
    <details><summary>Do I need an account to play?</summary><p>Solo and Practice work without an account or an internet connection. Ranked requires an internet connection and Apple or email/password sign-in.</p></details>
    <details><summary>Why am I playing against AI in Ranked?</summary><p>If a human opponent isn’t available after a short search, the app offers an explicitly labelled AI game. These games are unranked and don’t change your public rating.</p></details>
    <details><summary>How do I recover my account?</summary><p>Sign in with the same Apple account or email address you used originally. For email accounts, use the password reset option on the sign-in screen. Guest progress stays on its original device.</p></details>
    <details><summary>How do I delete my account and data?</summary><p>Open Settings in the app, go to Privacy and support, and choose the account deletion action. Follow the confirmation and sign-in prompts. This permanently removes your account and cloud statistics. Guest saves and settings remain on your device; removing app data clears those, subject to your device’s backup behaviour. If deletion fails, retry when connected or contact us.</p></details>
    <details><summary>My online game disconnected. What should I do?</summary><p>Check your connection and reopen the app promptly to reconnect. Leaving an active ranked game for too long can result in a forfeit. If the problem continues, contact us with the approximate time and what you saw.</p></details>
  </div><p class="document-end">More about your data in our <a href="/privacy" data-route>privacy policy</a>.</p>`;

const policyNotice = !operator || !validEmail ? '<p class="draft-note">Pre-launch draft. Operator and contact details will be finalised before release.</p>' : '';
const privacy = `
  <p class="eyebrow">THE SMALL PRINT, IN PLAIN WORDS</p><h1>Privacy policy</h1><p class="document-date">Last updated 19 September 2026</p>${policyNotice}
  <p>This policy explains how ${operator ? escape(operator) : 'Narnigrams'} handles information when you use the Narnigrams app and this website.</p>
  <h2>Playing on your device</h2><p>Solo and Practice can be played without an account. Guest settings, saved games, and statistics are stored on your device. Device backups may retain this information according to your platform settings.</p>
  <h2>Accounts and online play</h2><p>When you sign in with Apple or email and password, Firebase Authentication processes your sign-in identity and email address, including an Apple relay address if you choose one. Firebase handles password authentication. We use an account identifier and saved session to keep you signed in.</p><p>Online services store a generated player name, rating, statistics, matchmaking records, game state, and results. Signed-in Solo and Practice statistics also sync to your account, and your first sign-in imports saved game history. We use this information to provide matchmaking, restore progress, validate moves, settle results, and maintain fair play.</p><p>Other players can see your generated name, rating, and limited match progress. They cannot view your private hand or board through the app.</p>
  <h2>Website visits and support</h2><p>This website does not add advertising cookies or analytics. Our hosting provider, Vercel, may process technical request information, such as IP addresses, browser information, and request times, to deliver and secure the site. If you contact support, we use your email address and the information you choose to send to respond to your request.</p>
  <h2>Service providers and sharing</h2><p>Google Firebase provides authentication, database, and online game services. Apple processes Sign in with Apple when you choose it. Vercel hosts this website. These providers may process information in countries other than your own under their service arrangements. We may also disclose information when legally required or necessary to protect users and the service. We do not sell personal information, and the app does not include advertising, cross-app tracking, or analytics.</p>
  <h2>How long information stays</h2><p>Account details and synced statistics are retained while your account is active. Temporary matchmaking and game records are used for reconnecting, result settlement, and service operation, and are subject to service cleanup. Operational logs and infrastructure backups may remain for their configured retention periods after active records are deleted. Support correspondence is retained as needed to resolve requests and meet applicable obligations.</p>
  <h2>Your choices and deletion</h2><p>You can play offline modes without signing in. To delete your account and cloud data, open Settings → Privacy and support in the app and follow the account deletion prompts. Deletion removes your sign-in identity, profile, queue records, synced statistics, and associated match records. An opponent’s aggregate rating is retained. Local guest saves and settings remain until you remove app data, subject to device backups.</p><p>To request access to or correction of your information, ask about deletion, or raise a privacy concern, use our <a href="/support" data-route>support page</a>. We may need to verify account ownership before acting on a request. Depending on where you live, additional privacy rights may apply.</p>
  <h2>Children and changes</h2><p>Narnigrams is not specifically directed at children. If you believe a child has provided personal information that should be removed, contact us. We may update this policy as the service changes and will publish the revised date here.</p><h2>Contact</h2><p>${operator ? `Operator: ${escape(operator)}.<br>` : ''}${contact}</p>`;

const terms = `
  <p class="eyebrow">A FEW GROUND RULES</p><h1>Terms of use</h1><p class="document-date">Last updated 19 September 2026</p>${policyNotice}
  <p>These terms apply to your use of Narnigrams and this website${operator ? `, provided by ${escape(operator)}` : ''}. By using the service, you agree to these terms. If you do not agree, please stop using it.</p>
  <h2>Using Narnigrams</h2><p>You may use the app for personal, non-commercial play in accordance with these terms and applicable law. If you are under the age at which you can agree to these terms where you live, a parent or guardian must agree on your behalf.</p>
  <h2>Your account</h2><p>Solo and Practice do not require an account. Online Ranked play requires sign-in. Keep your credentials secure and use an account you are authorised to access. Contact support if you believe someone has accessed your account without permission.</p>
  <h2>Fair play</h2><p>Do not use automated play, external solvers, exploits, or collusion to manipulate ranked results. Do not interfere with other players or attempt to access private game information or disrupt the service. Access may be restricted where necessary to address abuse or protect the service; contact support if you believe a restriction is mistaken.</p>
  <h2>Games and availability</h2><p>Online play depends on an internet connection and service availability. Disconnecting or leaving an active ranked game may result in a forfeit. AI fallback games are labelled and do not affect your public rating. We may update game rules and features or interrupt the service for maintenance. Ratings, saved games, and uninterrupted availability are not guaranteed.</p>
  <h2>App content</h2><p>The app’s branding, design, and software are protected by applicable intellectual property laws. Your permission to use the app does not transfer ownership. Third-party components and dictionary data remain subject to their own licences and notices.</p>
  <h2>Privacy and leaving</h2><p>Our <a href="/privacy" data-route>privacy policy</a> explains information handling. You may stop using the service at any time and delete your account through Settings → Privacy and support. Cloud account deletion is permanent.</p>
  <h2>Your legal rights</h2><p>Nothing in these terms excludes consumer guarantees or other rights that cannot lawfully be excluded, including rights under Australian Consumer Law where applicable. Subject to those rights, the service is provided as available, and we do not promise that it will always be uninterrupted or error-free.</p>
  <h2>Changes and contact</h2><p>We may update these terms as Narnigrams evolves. Updated terms will be published here with a revised date. For questions about these terms, contact us through the <a href="/support" data-route>support page</a>.</p>`;

const pages: Record<string, { title: string; body: string }> = {
  '/': { title: 'A little wordplay goes a long way.', body: home },
  '/support': { title: 'Support', body: support },
  '/privacy': { title: 'Privacy policy', body: privacy },
  '/terms': { title: 'Terms of use', body: terms },
};
function render(focus = false) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const page = pages[path] ?? { title: 'Page not found', body: '<p class="eyebrow">A LETTER OUT OF PLACE</p><h1>Page not found.</h1><p>Let’s get you back to the good words.</p><a class="button" href="/" data-route>Back to home →</a>' };
  document.title = `Narnigrams — ${page.title}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', path === '/' ? 'Make words. Find your flow. Meet Narnigrams, the word-tile game for iPhone.' : `${page.title} for the Narnigrams word-tile game.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.getElementById('app')!.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header><a class="brand" href="/" data-route aria-label="Narnigrams home"><span class="brand-icon" aria-hidden="true">n</span>narnigrams<span class="brand-dot">.</span></a><nav aria-label="Main navigation"><a href="/support" data-route ${path === '/support' ? 'aria-current="page"' : ''}>Support <span aria-hidden="true">↗</span></a></nav></header>
    <main id="main" tabindex="-1" class="${path === '/' ? 'home' : 'document'}">${page.body}</main>
    <footer><a class="footer-brand" href="/" data-route>narnigrams.</a><span class="footer-note">A little play, every day.</span><nav aria-label="Legal and support">${links.map(([url,label])=>`<a href="${url}" data-route ${path === url ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><span class="copyright">© ${new Date().getFullYear()} ${escape(operator || 'Narnigrams')}</span></footer>`;
  if (focus) document.getElementById('main')!.focus({ preventScroll: true });
}
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[data-route]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState(null, '', link.href);
  render(true);
  window.scrollTo(0, 0);
});
window.addEventListener('popstate', () => render(true));
render();
