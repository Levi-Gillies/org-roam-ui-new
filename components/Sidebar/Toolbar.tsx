import React from 'react'
import { Flex, IconButton, ButtonGroup, Tooltip } from '@chakra-ui/react'
import { MdOutlineExpand, MdOutlineCompress } from 'react-icons/md'
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'

export interface ToolbarProps {
  setPreviewNode: any
  canUndo: any
  canRedo: any
  resetPreviewNode: any
  previousPreviewNode: any
  nextPreviewNode: any
  collapse: boolean
  setCollapse: any
}

export const Toolbar = (props: ToolbarProps) => {
  const {
    setPreviewNode,
    canUndo,
    canRedo,
    resetPreviewNode,
    previousPreviewNode,
    nextPreviewNode,
    collapse,
    setCollapse,
  } = props
  return (
    <Flex flex="0 1 40px" pb={3} alignItems="center" justifyContent="space-between" pr={1}>
      <Flex>
        <ButtonGroup isAttached>
          <Tooltip label="Go backward">
            <IconButton
              _focus={{}}
              variant="subtle"
              icon={<ChevronLeftIcon />}
              aria-label="Previous node"
              disabled={!canUndo}
              onClick={() => previousPreviewNode()}
            />
          </Tooltip>
          <Tooltip label="Go forward">
            <IconButton
              _focus={{}}
              variant="subtle"
              icon={<ChevronRightIcon />}
              aria-label="Next node"
              disabled={!canRedo}
              onClick={() => nextPreviewNode()}
            />
          </Tooltip>
        </ButtonGroup>
      </Flex>
      <Flex>
        <Tooltip label="Toggle headers">
          <IconButton
            variant="subtle"
            aria-label="Toggle headers"
            icon={collapse ? <MdOutlineExpand /> : <MdOutlineCompress />}
            onClick={() => setCollapse((curr: boolean) => !curr)}
          />
        </Tooltip>
      </Flex>
    </Flex>
  )
}
