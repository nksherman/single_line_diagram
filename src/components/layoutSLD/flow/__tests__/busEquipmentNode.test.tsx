import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import BusEquipmentNode from '../busEquipmentNode';
import Bus from '../../../../models/busEquipment';
import EquipmentBase from '../../../../models/equipmentBase';

// Mock the equipment dimensions utility
jest.mock('../../../../utils/equipmentDimensions', () => ({
  getBaseEquipmentSize: jest.fn(() => ({ width: 60, height: 40 })),
  calculateEquipmentDimensions: jest.fn(() => ({ width: 200, height: 40 })),
  getTextGroups: jest.fn(() => ({
    topLeft: 'Bus-01',
    topRight: '13.8kV',
    left: [],
    right: [],
    bottomLeft: '',
    bottomRight: '',
  })),
}));

describe('BusEquipmentNode', () => {
  let mockBus: Bus;
  let mockOnEdit: jest.Mock;
  let mockOnResize: jest.Mock;
  let mockGenerator: EquipmentBase;
  let mockLoad: EquipmentBase;

  beforeEach(() => {
    EquipmentBase.clearRegistry();
    mockBus = new Bus('BUS-01', 'Main Bus', { voltage: 13.8 });
    mockGenerator = new EquipmentBase('GEN-01', 'Generator', 'Generator');
    mockLoad = new EquipmentBase('LOAD-01', 'Load', 'Other');
    
    // Set up some connections
    mockBus.addSource(mockGenerator);
    mockBus.addLoad(mockLoad);
    
    mockOnEdit = jest.fn();
    mockOnResize = jest.fn();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  const renderComponent = (bus = mockBus, selected = false) => {
    return render(
      <ReactFlowProvider>
        <BusEquipmentNode
          data={{
            equipment: bus,
            onEdit: mockOnEdit,
            onResize: mockOnResize,
          }}
          selected={selected}
        />
      </ReactFlowProvider>
    );
  };

  test('displays bus information correctly', () => {
    renderComponent();
    
    expect(screen.getByText('Bus-01')).toBeInTheDocument();
    expect(screen.getByText('13.8kV')).toBeInTheDocument();
  });

  test('generates correct number of handles based on connections', () => {
    renderComponent();
    
    // Should have handles for sources (top) and loads (bottom)
    const topHandles = document.querySelectorAll('[data-handleid^="target"]');
    const bottomHandles = document.querySelectorAll('[data-handleid^="source"]');

    expect(topHandles.length).toBe(1); // One source
    expect(bottomHandles.length).toBe(1); // One load
  });

  test('handles multiple sources and loads', () => {
    // Add more connections
    const generator2 = new EquipmentBase('GEN-02', 'Generator 2', 'Generator');
    const load2 = new EquipmentBase('LOAD-02', 'Load 2', 'Other');
    
    mockBus.addSource(generator2);
    mockBus.addLoad(load2);
    
    renderComponent();
    
    const topHandles = document.querySelectorAll('[data-handleid^="target"]');
    const bottomHandles = document.querySelectorAll('[data-handleid^="source"]');
    
    expect(topHandles.length).toBe(2); // Two sources
    expect(bottomHandles.length).toBe(2); // Two loads
  });

  test('applies bus-specific styling', () => {
    renderComponent();
    
    const handles = document.querySelectorAll('[data-handleid]');
    handles.forEach(handle => {
      expect(handle).toHaveStyle('background: #9C27B0'); // Bus purple color
    });
  });

  test('renders with no connections', () => {
    const emptyBus = new Bus('BUS-EMPTY', 'Empty Bus', { voltage: 4.16 });
    renderComponent(emptyBus);
    
    // Should still render with default single handle
    const topHandles = document.querySelectorAll('[data-handleid="target-default"]');
    const bottomHandles = document.querySelectorAll('[data-handleid="source-default"]');
    
    expect(topHandles.length).toBe(1); // Default single handle
    expect(bottomHandles.length).toBe(1); // Default single handle
  });

  test('handles have correct positioning for multiple connections', () => {
    // Add more connections to test handle positioning
    const generator2 = new EquipmentBase('GEN-02', 'Generator 2', 'Generator');
    const generator3 = new EquipmentBase('GEN-03', 'Generator 3', 'Generator');
    
    mockBus.addSource(generator2);
    mockBus.addSource(generator3);
    
    renderComponent();
    
    const topHandles = document.querySelectorAll('[data-handleid^="target-"]');
    expect(topHandles.length).toBe(3); // Three sources
    
    // Check that handles have different left positions
    const positions = Array.from(topHandles).map(handle => 
      (handle as HTMLElement).style.left
    );
    
    // All positions should be different (distributed across the width)
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(3);
  });

  test('renders with minimal text groups', () => {
    // Mock with minimal text groups
    const mockMinimalTextGroups = {
      topLeft: null,
      topRight: null,
      left: [],
      right: [],
      bottomLeft: null,
      bottomRight: null,
    };

    jest.doMock('../../../../utils/equipmentDimensions', () => ({
      getBaseEquipmentSize: jest.fn(() => ({ width: 60, height: 40 })),
      calculateEquipmentDimensions: jest.fn(() => ({ width: 200, height: 40 })),
      getTextGroups: jest.fn(() => mockMinimalTextGroups),
    }));

    renderComponent();
    
    // Should still render the main structure without text
    expect(document.querySelectorAll('[data-handleid^="source-"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-handleid^="target-"]').length).toBeGreaterThan(0);
  });
});