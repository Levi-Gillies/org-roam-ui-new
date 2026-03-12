import React, { useContext, useEffect, useRef, useState } from 'react'

import { Toolbar } from './Toolbar'
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
  canUndo: any
  canRedo: any
  resetPreviewNode: any
  previousPreviewNode: any
  nextPreviewNode: any
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
  scrollRef?: (instance: any) => void
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
    canUndo,
    canRedo,
    resetPreviewNode,
    previousPreviewNode,
    nextPreviewNode,
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
    scrollRef,
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
  const [collapse, setCollapse] = useState(false)

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="floating-sidebar-backdrop" onClick={onClose} />
      <div className="floating-sidebar">
        <button className="floating-sidebar-close" onClick={onClose}>
          &times;
        </button>
        <Flex flexDir="column" h="100%" pl={2} width="100%">
          <Flex pl={2} alignItems="center" width="100%" pt={2}>
            <Flex pt={1} flexShrink={0}>
              <Toolbar
                {...{
                  setPreviewNode,
                  canUndo,
                  canRedo,
                  resetPreviewNode,
                  previousPreviewNode,
                  nextPreviewNode,
                  collapse,
                  setCollapse,
                }}
              />
            </Flex>
          </Flex>
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
        </Flex>
      </div>
    </>
  )
}

export default Sidebar
