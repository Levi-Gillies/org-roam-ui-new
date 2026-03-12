import React, { useContext, useEffect, useRef, useState } from 'react'

import { TagBar } from './TagBar'
import { Note } from './Note'
import { Title } from './Title'

import { VStack, Flex, Box } from '@chakra-ui/react'
import { Scrollbars } from 'react-custom-scrollbars-2'

import { GraphData, NodeObject, LinkObject } from 'force-graph'
import { OrgRoamNode } from '../../api'
import { ThemeContext } from '../../util/themecontext'
import { LinksByNodeId, NodeByCite, NodeById, Scope } from '../../pages/index'
import { usePersistantState } from '../../util/persistant-state'
import { initialFilter, TagColors } from '../config'

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
  scrollRef?: (instance: any) => void
  isInsertMode?: boolean
  insertModeText?: string
  setInsertModeText?: (text: string) => void
  isVisualMode?: boolean
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
    scrollRef,
    isInsertMode,
    insertModeText,
    setInsertModeText,
    isVisualMode,
    inNodeSearch,
    inNodeSearchQuery,
    inNodeSearchMatchCount,
    inNodeSearchCurrentIndex,
  } = props

  const { highlightColor } = useContext(ThemeContext)
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
      <div className="floating-sidebar-backdrop" onClick={onClose} />
      <div className={`floating-sidebar${isVisualMode ? ' visual-mode' : ''}`}>
        <Flex flexDir="column" h="100%" pl={2} width="100%">
          {isInsertMode ? (
            <textarea
              className="insert-mode-textarea"
              value={insertModeText || ''}
              onChange={(e) => setInsertModeText?.(e.target.value)}
              autoFocus
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
