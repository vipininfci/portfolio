const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');
document.documentElement.classList.add('js');
function closeMenu(returnFocus = false) {
  toggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  if (returnFocus) toggle.focus();
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav')) closeMenu();
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
matchMedia('(min-width: 1080px)').addEventListener('change', () => closeMenu());
