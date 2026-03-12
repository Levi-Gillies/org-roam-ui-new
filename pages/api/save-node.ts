import fs from 'fs'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { filePath, content, pos, level } = req.body

  if (!filePath || content === undefined) {
    res.status(400).json({ error: 'filePath and content are required' })
    return
  }

  try {
    if (level === 0 || level === undefined) {
      // Level 0: write content as entire file
      fs.writeFileSync(filePath, content, { encoding: 'utf-8' })
    } else {
      // Level > 0: replace section at pos
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' })
      const lines = fileContent.split('\n')

      // Find the heading line at pos
      let charCount = 0
      let headingLineIdx = -1
      for (let i = 0; i < lines.length; i++) {
        if (charCount >= pos) {
          headingLineIdx = i
          break
        }
        charCount += lines[i].length + 1 // +1 for newline
      }

      if (headingLineIdx === -1) {
        // pos is beyond file, append
        fs.writeFileSync(filePath, fileContent + '\n' + content, { encoding: 'utf-8' })
        res.status(200).json({ success: true })
        return
      }

      // Find the end of this section (next heading of same or higher level)
      const headingPrefix = '*'.repeat(level)
      let endLineIdx = lines.length
      for (let i = headingLineIdx + 1; i < lines.length; i++) {
        const match = lines[i].match(/^(\*+)\s/)
        if (match && match[1].length <= level) {
          endLineIdx = i
          break
        }
      }

      // Replace section
      const before = lines.slice(0, headingLineIdx)
      const after = lines.slice(endLineIdx)
      const newContent = [...before, content, ...after].join('\n')
      fs.writeFileSync(filePath, newContent, { encoding: 'utf-8' })
    }

    res.status(200).json({ success: true })
  } catch (e: any) {
    console.error('save-node error:', e)
    res.status(500).json({ error: e.message })
  }
}
