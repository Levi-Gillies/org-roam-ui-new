import React from 'react'

interface VimHelpProps {
  onClose: () => void
}

const keybindings = [
  ['/', 'Open search'],
  ['Escape', 'Close search / sidebar / help'],
  ['t', 'Toggle 2D/3D'],
  ['j / k', 'Scroll sidebar down / up'],
  ['h / l', 'Previous / next preview node'],
  ['g g', 'Scroll to top of sidebar'],
  ['G', 'Scroll to bottom of sidebar'],
  ['Ctrl+d / Ctrl+u', 'Half-page scroll down / up'],
  ['z z', 'Center/zoom to current node'],
  [':', 'Open command mode'],
  [':q Enter', 'Close sidebar'],
  [':help Enter', 'Show this help'],
  ['?', 'Toggle this help overlay'],
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
