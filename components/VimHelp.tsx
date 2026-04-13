import React from 'react'

interface VimHelpProps {
  onClose: () => void
}

const keybindings = [
  ['/', 'Search nodes / search in node (sidebar)'],
  ['n / N', 'Next / previous search match'],
  ['Escape', 'Close search/help/sidebar'],
  ['t', 'Toggle 2D/3D'],
  ['j / k', 'Scroll sidebar down / up'],
  ['h / l', 'Previous / next preview node'],
  ['Tab', 'Toggle collapse/expand headings'],
  ['e', 'Open the current node in Vim editor'],
  ['Alt+f', 'Toggle node fullscreen'],
  ['g g', 'Scroll to top'],
  ['G', 'Scroll to bottom'],
  ['Ctrl+d / Ctrl+u', 'Half-page scroll down / up'],
  ['z z', 'Center/zoom to current node'],
  [':w / :q / :q! / :wq', 'Save, quit, force quit, save+quit inside Vim editor'],
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
