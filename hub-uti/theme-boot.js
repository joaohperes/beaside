try {
  const theme = localStorage.getItem('hub-uti-theme')
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'
} catch {
  document.documentElement.dataset.theme = 'dark'
}
