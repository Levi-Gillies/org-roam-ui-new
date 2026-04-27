import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AddIcon, CloseIcon, MinusIcon } from '@chakra-ui/icons'

import { TagBar } from './TagBar'
import { Note } from './Note'
import { Title } from './Title'

import { VStack, Flex, Box, IconButton } from '@chakra-ui/react'
import { Scrollbars } from 'react-custom-scrollbars-2'

import { NodeObject } from 'force-graph'
import { OrgRoamNode } from '../../api'
import { LinksByNodeId, NodeByCite, NodeById, Scope } from '../../pages/index'
import { usePersistantState } from '../../util/persistant-state'
import { initialFilter, TagColors } from '../config'

const VimNodeEditor = dynamic(() => import('./VimNodeEditor'), { ssr: false })

export interface SidebarProps {
  isOpen: boolean
  onClose: any
  onOpen: any
  nodeById: NodeById
  previewNode: NodeObject
  setPreviewNode: any
  linksByNodeId: LinksByNodeId
  nodeByCite: NodeByCite
  setSidebarHighlightedNode: any
  openContextMenu: any
  scope: Scope
  setScope: any
  windowWidth: number
  filter: typeof initialFilter
  setFilter: any
  tagColors: TagColors
  setTagColors: any
  macros?: { [key: string]: string }
  attachDir: string
  useInheritance: boolean
  collapse: boolean
  setCollapse: (fn: (c: boolean) => boolean) => void
  showNodeUi?: boolean
  isFullscreen?: boolean
  onToggleCollapse?: () => void
  onCloseNode?: () => void
  scrollRef?: (instance: any) => void
  isEditorMode?: boolean
  editorText?: string
  setEditorText?: (text: string) => void
  onSaveEditor?: () => Promise<boolean>
  onWriteQuitEditor?: () => Promise<boolean>
  onQuitEditor?: (force?: boolean) => Promise<boolean>
  onToggleFullscreen?: () => void
  editorDirty?: boolean
  editorStatusMessage?: string
  previewRefreshToken?: number
  inNodeSearch?: boolean
  inNodeSearchQuery?: string
  inNodeSearchMatchCount?: number
  inNodeSearchCurrentIndex?: number
}

const Sidebar = (props: SidebarProps) => {
  const {
    isOpen,
    onOpen,
    onClose,
    previewNode,
    setPreviewNode,
    nodeById,
    linksByNodeId,
    nodeByCite,
    setSidebarHighlightedNode,
    openContextMenu,
    scope,
    setScope,
    windowWidth,
    filter,
    setFilter,
    tagColors,
    setTagColors,
    macros,
    attachDir,
    useInheritance,
    collapse,
    setCollapse,
    showNodeUi,
    isFullscreen,
    onToggleCollapse,
    onCloseNode,
    scrollRef,
    isEditorMode,
    editorText,
    setEditorText,
    onSaveEditor,
    onWriteQuitEditor,
    onQuitEditor,
    onToggleFullscreen,
    editorDirty,
    editorStatusMessage,
    previewRefreshToken,
    inNodeSearch,
    inNodeSearchQuery,
    inNodeSearchMatchCount,
    inNodeSearchCurrentIndex,
  } = props

  const [previewRoamNode, setPreviewRoamNode] = useState<OrgRoamNode | undefined>()

  useEffect(() => {
    if (!previewNode?.id) {
      onClose()
      return
    }
    onOpen()
    setPreviewRoamNode(previewNode as OrgRoamNode)
  }, [previewNode?.id])

  const [justification, setJustification] = usePersistantState('justification', 1)
  const [outline, setOutline] = usePersistantState('outline', true)
  const justificationList = ['justify', 'start', 'end', 'center']
  const [font, setFont] = useState('sans serif')
  const [indent, setIndent] = useState(0)

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div
        className={`floating-sidebar-backdrop${isFullscreen ? ' fullscreen' : ''}`}
        onClick={onClose}
      />
      <div className={`floating-sidebar${isFullscreen ? ' fullscreen' : ''}`}>
        {showNodeUi && (
          <div className="node-overlay-controls">
            <IconButton
              aria-label={collapse ? 'Expand headings' : 'Collapse headings'}
              icon={collapse ? <AddIcon /> : <MinusIcon />}
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
            />
            <IconButton
              aria-label="Close node"
              icon={<CloseIcon />}
              size="sm"
              variant="ghost"
              onClick={onCloseNode || onClose}
            />
          </div>
        )}
        <Flex flexDir="column" h="100%" pl={2} width="100%">
          {isEditorMode ? (
            <VimNodeEditor
              value={editorText || ''}
              nodeTitle={previewRoamNode?.title || 'Node'}
              dirty={Boolean(editorDirty)}
              statusMessage={editorStatusMessage || ''}
              onChange={(nextText) => setEditorText?.(nextText)}
              onSave={onSaveEditor || (async () => false)}
              onWriteQuit={onWriteQuitEditor || (async () => false)}
              onQuit={onQuitEditor || (async () => false)}
              onToggleFullscreen={onToggleFullscreen || (() => undefined)}
            />
          ) : (
            <Scrollbars
              ref={(instance: any) => { if (scrollRef) scrollRef(instance) }}
              autoHide
              style={{ flexGrow: 1 }}
              renderThumbVertical={({ style, ...props }) => (
                <Box
                  style={{
                    ...style,
                    borderRadius: 0,
                  }}
                  {...props}
                />
              )}
            >
              {previewRoamNode && (
                <VStack
                  flexGrow={1}
                  alignItems="left"
                  paddingLeft={4}
                  paddingRight={4}
                  paddingTop={3}
                  paddingBottom={4}
                >
                  <Title previewNode={previewRoamNode} />
                  <TagBar
                    {...{ filter, setFilter, tagColors, setTagColors, openContextMenu, previewNode }}
                  />
                  <Note
                    {...{
                      setPreviewNode,
                      previewNode,
                      nodeById,
                      nodeByCite,
                      setSidebarHighlightedNode,
                      justification,
                      justificationList,
                      linksByNodeId,
                      openContextMenu,
                      outline,
                      setOutline,
                      collapse,
                      macros,
                      attachDir,
                      useInheritance,
                      previewRefreshToken,
                    }}
                  />
                </VStack>
              )}
            </Scrollbars>
          )}
        </Flex>
        {inNodeSearch && (
          <div className="in-node-search-bar">
            <span className="in-node-search-prefix">/</span>
            <span className="in-node-search-query">{inNodeSearchQuery}</span>
            {(inNodeSearchMatchCount ?? 0) > 0 && (
              <span className="in-node-search-count">
                [{(inNodeSearchCurrentIndex ?? 0) + 1}/{inNodeSearchMatchCount}]
              </span>
            )}
            {inNodeSearchMatchCount === 0 && inNodeSearchQuery && (
              <span className="in-node-search-count">[No matches]</span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default Sidebar
