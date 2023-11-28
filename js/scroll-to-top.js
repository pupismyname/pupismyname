const links = document.querySelectorAll("[href='#top']");
for (const link of links) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  });
}
