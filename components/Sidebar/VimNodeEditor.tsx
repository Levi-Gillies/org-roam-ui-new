import { Box, Flex, Text } from '@chakra-ui/react'
import CodeMirror from 'codemirror'
import React, { useEffect, useRef, useState } from 'react'
import { Controlled as ControlledCodeMirror } from 'react-codemirror2'

import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/mode/simple'
import 'codemirror/addon/scroll/annotatescrollbar'
import 'codemirror/addon/search/matchesonscrollbar'
import 'codemirror/addon/search/search'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/keymap/vim'

interface VimNodeEditorProps {
  value: string
  nodeTitle: string
  dirty: boolean
  statusMessage: string
  onChange: (value: string) => void
  onSave: () => Promise<boolean>
  onWriteQuit: () => Promise<boolean>
  onQuit: (force?: boolean) => Promise<boolean>
  onToggleFullscreen: () => void
}

let exCommandsRegistered = false
const CodeMirrorVim = CodeMirror as any
let orgModeRegistered = false

const getEditorHandlers = (cm: CodeMirror.Editor) =>
  (cm as CodeMirror.Editor & {
    oruiVimHandlers?: {
      save?: () => Promise<boolean>
      quit?: (force?: boolean) => Promise<boolean>
      writeQuit?: () => Promise<boolean>
    }
  }).oruiVimHandlers

const registerExCommands = () => {
  if (exCommandsRegistered) {
    return
  }

  CodeMirrorVim.commands.save = (cm: CodeMirror.Editor) => {
    void getEditorHandlers(cm)?.save?.()
  }

  CodeMirrorVim.Vim.defineEx('quit', 'q', (cm: CodeMirror.Editor, params: any) => {
    const force = params?.argString?.trim() === '!'
    void getEditorHandlers(cm)?.quit?.(force)
  })

  CodeMirrorVim.Vim.defineEx('wq', 'wq', (cm: CodeMirror.Editor) => {
    void getEditorHandlers(cm)?.writeQuit?.()
  })

  CodeMirrorVim.Vim.defineEx('xit', 'x', (cm: CodeMirror.Editor) => {
    void getEditorHandlers(cm)?.writeQuit?.()
  })

  exCommandsRegistered = true
}

const registerOrgMode = () => {
  if (orgModeRegistered) {
    return
  }

  CodeMirrorVim.defineSimpleMode('orgmode', {
    start: [
      { regex: /^(\*+\s.*)$/, token: 'header' },
      { regex: /^(#\+[A-Z_]+:.*)$/, token: 'meta' },
      { regex: /^(\s*[-+]\s+\[[ X-]\].*)$/, token: 'variable-2' },
      { regex: /\[\[[^\]]+\](?:\[[^\]]*\])?\]/, token: 'link' },
      { regex: /\*[^*\n]+\*/, token: 'strong' },
      { regex: /\/[^\/\n]+\//, token: 'em' },
      { regex: /=[^=\n]+=|~[^~\n]+~/, token: 'quote' },
      { regex: /:(?:[A-Za-z0-9_@#%:-]+:)+/, token: 'tag' },
      { regex: /\b(TODO|NEXT|WAITING|DONE|CANCELLED)\b/, token: 'keyword' },
    ],
    meta: {
      lineComment: '# ',
    },
  })

  orgModeRegistered = true
}

const getModeLabel = (mode: { mode: string; subMode?: string } | undefined) => {
  if (!mode) {
    return 'NORMAL'
  }

  if (mode.mode === 'visual') {
    if (mode.subMode === 'linewise') {
      return 'VISUAL LINE'
    }
    if (mode.subMode === 'blockwise') {
      return 'VISUAL BLOCK'
    }
  }

  return mode.mode.toUpperCase()
}

export const VimNodeEditor = ({
  value,
  nodeTitle,
  dirty,
  statusMessage,
  onChange,
  onSave,
  onWriteQuit,
  onQuit,
  onToggleFullscreen,
}: VimNodeEditorProps) => {
  const editorRef = useRef<CodeMirror.Editor | null>(null)
  const [modeLabel, setModeLabel] = useState('NORMAL')
  const modeClass =
    modeLabel.startsWith('VISUAL')
      ? 'vim-mode-visual'
      : modeLabel === 'INSERT'
        ? 'vim-mode-insert'
        : 'vim-mode-normal'

  useEffect(() => {
    registerExCommands()
    registerOrgMode()
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    ;(editor as CodeMirror.Editor & { oruiVimHandlers?: unknown }).oruiVimHandlers = {
      save: onSave,
      quit: onQuit,
      writeQuit: onWriteQuit,
    }

    editor.focus()
  }, [onQuit, onSave, onWriteQuit])

  return (
    <Flex className={`vim-editor-shell ${modeClass}`} direction="column" h="100%">
      <Flex className="vim-editor-header" justify="space-between" align="center" gap={3}>
        <Box minW={0}>
          <Text className="vim-editor-title" isTruncated>
            {nodeTitle}
          </Text>
        </Box>
      </Flex>
      <Box flex="1" minH={0}>
        <ControlledCodeMirror
          value={value}
          options={{
            keyMap: 'vim',
            mode: 'orgmode',
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            scrollbarStyle: 'native',
            viewportMargin: Infinity,
            cursorHeight: 0.9,
          }}
          editorDidMount={(editor) => {
            editorRef.current = editor
            ;(editor as CodeMirror.Editor & { oruiVimHandlers?: unknown }).oruiVimHandlers = {
              save: onSave,
              quit: onQuit,
              writeQuit: onWriteQuit,
            }

            ;(editor as any).on('vim-mode-change', (mode: any) => {
              setModeLabel(getModeLabel(mode as { mode: string; subMode?: string }))
            })

            editor.focus()
          }}
          onBeforeChange={(_editor, _data, nextValue) => {
            onChange(nextValue)
          }}
          onKeyDown={(_editor, event) => {
            if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'f' && modeLabel === 'NORMAL') {
              event.preventDefault()
              onToggleFullscreen()
            }
            event.stopPropagation()
          }}
        />
      </Box>
      <Flex className="vim-editor-statusbar" justify="space-between" align="center" gap={4}>
        <Text>{modeLabel}</Text>
        <Text className="vim-editor-status-message" isTruncated>
          {statusMessage || (dirty ? '[+]' : '[saved]')}
        </Text>
      </Flex>
    </Flex>
  )
}

export default VimNodeEditor
