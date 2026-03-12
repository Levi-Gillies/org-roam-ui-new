export const getThemeColor = (name: string, theme: any) => {
  if (!name || name.startsWith('#') || name.startsWith('rgb')) {
    return name
  }
  return name.split('.').reduce((o, i) => o?.[i], theme.colors) ?? name
}
