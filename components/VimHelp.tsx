import React from 'react'

interface VimHelpProps {
  onClose: () => void
}

const keybindings = [
  ['/', 'Search nodes / search in node (sidebar)'],
  ['n / N', 'Next / previous search match'],
  ['Escape', 'Close / exit mode'],
  ['t', 'Toggle 2D/3D'],
  ['j / k', 'Scroll sidebar down / up'],
  ['h / l', 'Previous / next preview node'],
  ['Tab', 'Toggle collapse/expand headings'],
  ['i', 'Enter insert mode (edit raw org text)'],
  ['v', 'Enter visual mode (select + yank text)'],
  ['y', 'Yank selection (visual mode)'],
  ['g g', 'Scroll to top'],
  ['G', 'Scroll to bottom'],
  ['Ctrl+d / Ctrl+u', 'Half-page scroll down / up'],
  ['z z', 'Center/zoom to current node'],
  [':', 'Command mode'],
  [':q Enter', 'Close sidebar'],
  [':help Enter', 'Show help'],
  ['?', 'Toggle help'],
]

export default function VimHelp({ onClose }: VimHelpProps) {
  return (
    <>
      <div className="vim-help-backdrop" onClick={onClose} />
      <div className="vim-help-overlay">
        <h2>Keybindings</h2>
        <table>
          <tbody>
            {keybindings.map(([key, desc]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
