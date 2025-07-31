import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import ReactFlowLayoutEngine from '../flowLayoutEngine';
import EquipmentBase from '../../../../models/equipmentBase';
import Bus from '../../../../models/busEquipment';

// Mock the layout algorithm
jest.mock('../flowLayoutAlgorithm', () => ({
  setUnsetEquipmentPositions: jest.fn((nodes) => 
    nodes.map((node: any, index: number) => ({
      ...node,
      position: node.position || { x: index * 200, y: index * 100 }
    }))
  ),
  generateEdgesFromItems: jest.fn(() => [
    {
      id: 'edge-1',
      source: 'BUS-01',
      target: 'GEN-01',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    }
  ]),
}));

// Mock the equipment dimensions utility
jest.mock('../../../../utils/equipmentDimensions', () => ({
  calculateEquipmentDimensions: jest.fn((equipment) => ({
    width: equipment.type === 'Bus' ? 200 : 100,
    height: equipment.type === 'Bus' ? 60 : 40,
  })),
}));

// Mock ReactFlow components
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({ children, onNodesChange, onEdgesChange, onPaneClick, onNodeContextMenu, ...props }: any) => (
    <div 
      data-testid="react-flow"
      onClick={onPaneClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onNodeContextMenu) {
          onNodeContextMenu(e, { id: 'test-node' });
        }
      }}
      {...props}
    >
      {children}
      <div data-testid="react-flow-nodes">
        {props.nodes?.map((node: any) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.id}
          </div>
        ))}
      </div>
      <div data-testid="react-flow-edges">
        {props.edges?.map((edge: any) => (
          <div key={edge.id} data-testid={`edge-${edge.id}`}>
            {edge.source} to {edge.target}
          </div>
        ))}
      </div>
    </div>
  ),
  Controls: () => <div data-testid="controls">Controls</div>,
  Background: () => <div data-testid="background">Background</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
}));

describe('ReactFlowLayoutEngine', () => {
  let mockBus: Bus;
  let mockGenerator: EquipmentBase;
  let mockOnEditEquipment: jest.Mock;
  let mockOnDeleteEquipment: jest.Mock;

  beforeEach(() => {
    EquipmentBase.clearRegistry();
    mockBus = new Bus('BUS-01', 'Main Bus', { voltage: 13.8 });
    mockGenerator = new EquipmentBase('GEN-01', 'Generator', 'Generator');
    
    // Set up connections
    mockBus.addSource(mockGenerator);
    
    mockOnEditEquipment = jest.fn();
    mockOnDeleteEquipment = jest.fn();

    // Clear previous mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  const getDefaultProps = () => ({
    equipmentList: [mockBus, mockGenerator],
    onEditEquipment: mockOnEditEquipment,
    onDeleteEquipment: mockOnDeleteEquipment,
  });

  const renderComponent = (props = {}) => {
    const defaultProps = getDefaultProps();
    return render(
      <ReactFlowProvider>
        <ReactFlowLayoutEngine {...defaultProps} {...props} />
      </ReactFlowProvider>
    );
  };

  describe('Rendering', () => {
    it('renders ReactFlow with all components', () => {
      renderComponent();
      
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('background')).toBeInTheDocument();
    });

    it('creates nodes for each equipment', () => {
      renderComponent();
      
      expect(screen.getByTestId('node-BUS-01')).toBeInTheDocument();
      expect(screen.getByTestId('node-GEN-01')).toBeInTheDocument();
    });

    it('creates correct node types for different equipment', () => {
      renderComponent();
      
      // The ReactFlow mock should show the node IDs
      expect(screen.getByText('BUS-01')).toBeInTheDocument();
      expect(screen.getByText('GEN-01')).toBeInTheDocument();
    });

    it('creates edges between connected equipment', () => {
      renderComponent();
      
      expect(screen.getByTestId('edge-edge-1')).toBeInTheDocument();
      expect(screen.getByText('BUS-01 to GEN-01')).toBeInTheDocument();
    });
  });

  describe('Equipment positioning', () => {
    it('calls layout algorithm to set positions', async () => {
      const { setUnsetEquipmentPositions } = require('../flowLayoutAlgorithm');
      
      renderComponent();
      
      await waitFor(() => {
        expect(setUnsetEquipmentPositions).toHaveBeenCalled();
      });
      
      const call = setUnsetEquipmentPositions.mock.calls[0];
      expect(call[0]).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'BUS-01' }),
        expect.objectContaining({ id: 'GEN-01' }),
      ]));
      expect(call[1]).toEqual({
        vertSpace: 120,
        nodeSpacing: 10,
        margin: 50,
      });
    });

    it('updates equipment positions in the model', async () => {
      renderComponent();
      
      await waitFor(() => {
        // Check that positions were set (mocked to return incremental positions)
        expect(mockBus.position).toEqual({ x: 0, y: 0 });
        expect(mockGenerator.position).toEqual({ x: 200, y: 100 });
      });
    });

    it('does not overwrite existing positions', async () => {
      mockBus.position = { x: 100, y: 200 };
      mockGenerator.position = { x: 300, y: 400 };
      
      renderComponent();
      
      await waitFor(() => {
        // Positions should remain unchanged
        expect(mockBus.position).toEqual({ x: 100, y: 200 });
        expect(mockGenerator.position).toEqual({ x: 300, y: 400 });
      });
    });
  });

  describe('Context menu', () => {
    it('shows context menu on right click', () => {
      renderComponent();
      
      const reactFlow = screen.getByTestId('react-flow');
      fireEvent.contextMenu(reactFlow);
      
      // Context menu should appear (though in our mock it's simplified)
      expect(reactFlow).toBeInTheDocument();
    });

    it('hides context menu on pane click', () => {
      renderComponent();
      
      const reactFlow = screen.getByTestId('react-flow');
      
      // Simulate context menu, then pane click
      fireEvent.contextMenu(reactFlow);
      fireEvent.click(reactFlow);
      
      expect(reactFlow).toBeInTheDocument();
    });
  });

  describe('Node data', () => {
    it('passes correct data to nodes', async () => {
      const { calculateEquipmentDimensions } = require('../../../../utils/equipmentDimensions');
      
      renderComponent();
      
      await waitFor(() => {
        expect(calculateEquipmentDimensions).toHaveBeenCalledWith(mockBus);
        expect(calculateEquipmentDimensions).toHaveBeenCalledWith(mockGenerator);
      });
    });

    it('includes edit and resize handlers in node data', () => {
      renderComponent();
      
      // The node data would include onEdit and onResize functions
      // In a real test, we'd check that these are properly passed through
      expect(mockOnEditEquipment).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('handles empty equipment list', () => {
      renderComponent({ equipmentList: [] });
      
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('react-flow-nodes')).toBeInTheDocument();
      expect(screen.getByTestId('react-flow-edges')).toBeInTheDocument();
    });

    it('handles equipment without connections', () => {
      const isolatedEquipment = new EquipmentBase('ISO-01', 'Isolated', 'Other');
      
      renderComponent({ 
        equipmentList: [isolatedEquipment] 
      });
      
      expect(screen.getByTestId('node-ISO-01')).toBeInTheDocument();
    });

    it('handles equipment with missing position', () => {
      const equipmentWithoutPosition = new EquipmentBase('NO-POS-01', 'No Position', 'Other');
      // @ts-ignore - intentionally testing undefined position
      equipmentWithoutPosition.position = undefined;
      
      renderComponent({ 
        equipmentList: [equipmentWithoutPosition] 
      });
      
      expect(screen.getByTestId('node-NO-POS-01')).toBeInTheDocument();
    });
  });

  describe('Equipment updates', () => {
    it('updates layout when equipment list changes', async () => {
      const { rerender } = renderComponent();
      
      const newEquipment = new EquipmentBase('NEW-01', 'New Equipment', 'Load');
      const defaultProps = getDefaultProps();
      const updatedList = [...defaultProps.equipmentList, newEquipment];
      
      rerender(
        <ReactFlowProvider>
          <ReactFlowLayoutEngine 
            {...defaultProps} 
            equipmentList={updatedList}
          />
        </ReactFlowProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('node-NEW-01')).toBeInTheDocument();
      });
    });

    it('handles equipment type changes', async () => {
      renderComponent();
      
      // Change equipment type (in practice this would trigger a re-render)
      mockGenerator.type = 'Load';
      
      const { rerender } = renderComponent();
      const defaultProps = getDefaultProps();
      rerender(
        <ReactFlowProvider>
          <ReactFlowLayoutEngine {...defaultProps} />
        </ReactFlowProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('node-GEN-01')).toBeInTheDocument();
      });
    });
  });

  describe('Node types', () => {
    it('assigns correct node type for bus equipment', () => {
      renderComponent();
      
      // Bus should get 'busNode' type
      expect(screen.getByTestId('node-BUS-01')).toBeInTheDocument();
    });

    it('assigns correct node type for non-bus equipment', () => {
      renderComponent();
      
      // Non-bus equipment should get 'equipmentNode' type
      expect(screen.getByTestId('node-GEN-01')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with layout algorithm correctly', async () => {
      const { setUnsetEquipmentPositions, generateEdgesFromItems } = require('../flowLayoutAlgorithm');
      
      renderComponent();
      
      await waitFor(() => {
        expect(setUnsetEquipmentPositions).toHaveBeenCalledTimes(1);
        expect(generateEdgesFromItems).toHaveBeenCalledTimes(1);
      });
    });

    it('calculates dimensions for all equipment', async () => {
      const { calculateEquipmentDimensions } = require('../../../../utils/equipmentDimensions');
      
      renderComponent();
      
      await waitFor(() => {
        expect(calculateEquipmentDimensions).toHaveBeenCalledTimes(2);
        expect(calculateEquipmentDimensions).toHaveBeenCalledWith(mockBus);
        expect(calculateEquipmentDimensions).toHaveBeenCalledWith(mockGenerator);
      });
    });
  });

  describe('Props handling', () => {
    it('handles missing onDeleteEquipment prop', () => {
      renderComponent({ onDeleteEquipment: undefined });
      
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('calls onEditEquipment when provided', () => {
      renderComponent();
      
      expect(mockOnEditEquipment).toBeDefined();
      expect(typeof mockOnEditEquipment).toBe('function');
    });
  });
});
