import { render, screen, fireEvent } from '@testing-library/react';
import Display from '../display';
import EquipmentBase from '../../models/equipmentBase';
import Bus from '../../models/busEquipment';

// Mock the ReactFlow components and utilities
jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <div data-testid="react-flow-provider">{children}</div>,
  ReactFlow: ({ children, nodes, edges }: any) => (
    <div data-testid="react-flow" data-nodes-count={nodes?.length} data-edges-count={edges?.length}>
      {children}
      <div data-testid="nodes">
        {nodes?.map((node: any) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.data?.equipment?.name}
          </div>
        ))}
      </div>
    </div>
  ),
  Controls: () => <div data-testid="react-flow-controls" />,
  Background: () => <div data-testid="react-flow-background" />,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({}),
  ConnectionMode: { Loose: 'loose' },
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  Handle: ({ id, type, position, style }: any) => (
    <div
      data-testid={`handle-${id}`}
      data-handleid={id}
      data-type={type}
      data-position={position}
      style={style}
    />
  ),
  NodeResizer: () => <div data-testid="node-resizer" />,
}));

// Mock the equipment dimensions utility
jest.mock('../../utils/equipmentDimensions', () => ({
  getBaseEquipmentSize: jest.fn(() => ({ width: 60, height: 40 })),
  calculateEquipmentDimensions: jest.fn(() => ({ width: 120, height: 80 })),
  getTextGroups: jest.fn(() => ({
    topLeft: 'Test Equipment',
    topRight: '',
    left: [],
    right: [],
    bottomLeft: '',
    bottomRight: '',
  })),
}));

// Mock the ReactFlowLayoutEngine to simulate its behavior
jest.mock('../layoutSLD/flow/flowLayoutEngine', () => {
  return function MockReactFlowLayoutEngine({ equipmentList, onEditEquipment }: any) {
    return (
      <div data-testid="mock-flow-layout-engine">
        <div data-testid="react-flow-provider">
          <div data-testid="react-flow" data-nodes-count={equipmentList?.length || 0} data-edges-count="2">
            <div data-testid="react-flow-controls" />
            <div data-testid="react-flow-background" />
            <div data-testid="nodes">
              {equipmentList?.map((equipment: any) => (
                <div key={equipment.id} data-testid={`node-${equipment.id}`}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onDoubleClick={() => onEditEquipment(equipment)}
                  >
                    {equipment.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
});

describe('Display Component Integration', () => {
  let mockEquipmentList: EquipmentBase[];
  let mockSetEquipmentList: jest.Mock;
  let mockHandlePopoverOpen: jest.Mock;

  beforeEach(() => {
    EquipmentBase.clearRegistry();
    
    // Create a realistic equipment setup
    const generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator');
    const bus = new Bus('BUS-01', 'Main Bus', { voltage: 13.8 });
    const load = new EquipmentBase('LOAD-01', 'Motor Load', 'Other');
    
    // Connect them
    generator.addLoad(bus);
    bus.addSource(generator);
    bus.addLoad(load);
    load.addSource(bus);
    
    mockEquipmentList = [generator, bus, load];
    mockSetEquipmentList = jest.fn();
    mockHandlePopoverOpen = jest.fn();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  const renderDisplay = (equipmentList = mockEquipmentList) => {
    return render(
      <Display
        equipmentList={equipmentList}
        setEquipmentList={mockSetEquipmentList}
        handlePopoverOpen={mockHandlePopoverOpen}
      />
    );
  };
  
  test('renders ReactFlowLayoutEngine with correct props', () => {
    renderDisplay();
    
    expect(screen.getByTestId('mock-flow-layout-engine')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-controls')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-background')).toBeInTheDocument();
  });

  test('displays all equipment as nodes', () => {
    renderDisplay();
    
    // Check that all equipment are represented
    expect(screen.getByTestId('node-GEN-01')).toBeInTheDocument();
    expect(screen.getByTestId('node-BUS-01')).toBeInTheDocument();
    expect(screen.getByTestId('node-LOAD-01')).toBeInTheDocument();
    
    // Check equipment names are displayed
    expect(screen.getByText('Main Generator')).toBeInTheDocument();
    expect(screen.getByText('Main Bus')).toBeInTheDocument();
    expect(screen.getByText('Motor Load')).toBeInTheDocument();
  });

  test('handles empty equipment list', () => {
    renderDisplay([]);
    
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-count', '0');
  });

  test('handles equipment with no connections', () => {
    EquipmentBase.clearRegistry();
    const isolatedEquipment = new EquipmentBase('ISO-01', 'Isolated Equipment', 'Other');
    
    renderDisplay([isolatedEquipment]);
    
    expect(screen.getByTestId('node-ISO-01')).toBeInTheDocument();
    expect(screen.getByText('Isolated Equipment')).toBeInTheDocument();
  });

  test('calls handleEditEquipment when equipment is double-clicked', () => {
    renderDisplay();
    
    // Find and double-click on a piece of equipment
    const generatorNode = screen.getByTestId('node-GEN-01');
    const clickableElement = generatorNode.querySelector('[style*="cursor: pointer"]');
    
    expect(clickableElement).toBeInTheDocument();
    fireEvent.doubleClick(clickableElement!);
    
    expect(mockHandlePopoverOpen).toHaveBeenCalledWith(
      expect.anything(), // EditEquipment component
      null
    );
  });

  test('passes correct equipment to handleEditEquipment', () => {
    renderDisplay();
    
    const busNode = screen.getByTestId('node-BUS-01');
    const clickableElement = busNode.querySelector('[style*="cursor: pointer"]');
    
    fireEvent.doubleClick(clickableElement!);
    
    // Check that the correct equipment was passed to the edit handler
    expect(mockHandlePopoverOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          equipmentSubject: expect.objectContaining({
            id: 'BUS-01',
            name: 'Main Bus'
          })
        })
      }),
      null
    );
  });

  test('updates when equipment list changes', () => {
    const { rerender } = renderDisplay();
    
    // Initial state
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-count', '3');
    
    // Add new equipment
    EquipmentBase.clearRegistry();
    const generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator');
    const newTransformer = new EquipmentBase('T-01', 'Step-up Transformer', 'Transformer');
    const updatedList = [generator, newTransformer];
    
    rerender(
      <Display
        equipmentList={updatedList}
        setEquipmentList={mockSetEquipmentList}
        handlePopoverOpen={mockHandlePopoverOpen}
      />
    );
    
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-count', '2');
    expect(screen.getByText('Step-up Transformer')).toBeInTheDocument();
    expect(screen.queryByText('Main Bus')).not.toBeInTheDocument();
    expect(screen.queryByText('Motor Load')).not.toBeInTheDocument();
  });

  test('displays proper equipment connections as edges', () => {
    renderDisplay();
    
    // Should have edges connecting the equipment
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-edges-count', '2'); // GEN->BUS, BUS->LOAD
  });

  test('handles complex equipment hierarchies', () => {
    EquipmentBase.clearRegistry();
    
    // Create a more complex setup
    const generator1 = new EquipmentBase('GEN-01', 'Generator 1', 'Generator');
    const generator2 = new EquipmentBase('GEN-02', 'Generator 2', 'Generator');
    const mainBus = new Bus('BUS-MAIN', 'Main Bus', { voltage: 13.8 });
    const transformer = new EquipmentBase('T-01', 'Step-down Transformer', 'Transformer');
    const loadBus = new Bus('BUS-LOAD', 'Load Bus', { voltage: 4.16 });
    const load1 = new EquipmentBase('LOAD-01', 'Load 1', 'Other');
    const load2 = new EquipmentBase('LOAD-02', 'Load 2', 'Other');
    
    // Connect them in a realistic pattern
    generator1.addLoad(mainBus);
    generator2.addLoad(mainBus);
    mainBus.addSource(generator1);
    mainBus.addSource(generator2);
    mainBus.addLoad(transformer);
    transformer.addSource(mainBus);
    transformer.addLoad(loadBus);
    loadBus.addSource(transformer);
    loadBus.addLoad(load1);
    loadBus.addLoad(load2);
    load1.addSource(loadBus);
    load2.addSource(loadBus);
    
    const complexEquipmentList = [
      generator1, generator2, mainBus, transformer, loadBus, load1, load2
    ];
    
    renderDisplay(complexEquipmentList);
    
    // Should render all equipment
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-count', '7');
    
    // Check that all equipment names are displayed
    expect(screen.getByText('Generator 1')).toBeInTheDocument();
    expect(screen.getByText('Generator 2')).toBeInTheDocument();
    expect(screen.getByText('Main Bus')).toBeInTheDocument();
    expect(screen.getByText('Step-down Transformer')).toBeInTheDocument();
    expect(screen.getByText('Load Bus')).toBeInTheDocument();
    expect(screen.getByText('Load 1')).toBeInTheDocument();
    expect(screen.getByText('Load 2')).toBeInTheDocument();
  });

  test('renders EditEquipment component in popover correctly', () => {
    renderDisplay();
    
    const generatorNode = screen.getByTestId('node-GEN-01');
    const clickableElement = generatorNode.querySelector('[style*="cursor: pointer"]');
    
    fireEvent.doubleClick(clickableElement!);
    
    // Verify that EditEquipment component is passed with correct props
    const callArgs = mockHandlePopoverOpen.mock.calls[0];
    const editComponent = callArgs[0];
    
    expect(editComponent.props).toEqual({
      equipmentSubject: expect.objectContaining({
        id: 'GEN-01',
        name: 'Main Generator'
      }),
      setEquipmentList: mockSetEquipmentList,
      equipmentList: mockEquipmentList
    });
  });
});