import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import ReactFlowEquipmentNode from '../flowEquipmentNode';
import EquipmentBase from '../../../../models/equipmentBase';

// Mock the equipment dimensions utility
jest.mock('../../../../utils/equipmentDimensions', () => ({
  getBaseEquipmentSize: jest.fn(() => ({ width: 60, height: 40 })),
  calculateEquipmentDimensions: jest.fn(() => ({ width: 120, height: 80 })),
  getTextGroups: jest.fn(() => ({
    topLeft: 'TL',
    topRight: 'TR',
    left: ['L1', 'L2'],
    right: ['R1', 'R2'],
    bottomLeft: 'BL',
    bottomRight: 'BR',
  })),
}));

describe('ReactFlowEquipmentNode', () => {
  let mockEquipment: EquipmentBase;
  let mockOnEdit: jest.Mock;

  beforeEach(() => {
    EquipmentBase.clearRegistry();
    mockEquipment = new EquipmentBase('GEN-01', 'Test Generator', 'Generator');
    mockOnEdit = jest.fn();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  const renderComponent = (equipment = mockEquipment, selected = false) => {
    return render(
      <ReactFlowProvider>
        <ReactFlowEquipmentNode
          data={{
            equipment,
            onEdit: mockOnEdit,
          }}
          selected={selected}
        />
      </ReactFlowProvider>
    );
  };

  test('renders equipment node with correct structure', () => {
    renderComponent();
    
    // Check if React Flow handles are rendered
    expect(document.querySelector('[data-handleid="top"]')).toBeInTheDocument();
    expect(document.querySelector('[data-handleid="bottom"]')).toBeInTheDocument();
  });

  test('displays equipment text groups correctly', () => {
    renderComponent();
    
    // Check for specific text content using text queries
    expect(screen.getByText('TL')).toBeInTheDocument();
    expect(screen.getByText('TR')).toBeInTheDocument();
    expect(screen.getByText('L1')).toBeInTheDocument();
    expect(screen.getByText('L2')).toBeInTheDocument();
    expect(screen.getByText('R1')).toBeInTheDocument();
    expect(screen.getByText('R2')).toBeInTheDocument();
    expect(screen.getByText('BL')).toBeInTheDocument();
    expect(screen.getByText('BR')).toBeInTheDocument();
  });

  test('applies correct color based on equipment type', () => {
    renderComponent();
    
    // Check if handles have the correct color style
    const topHandle = document.querySelector('[data-handleid="top"]');
    const bottomHandle = document.querySelector('[data-handleid="bottom"]');
    
    expect(topHandle).toHaveStyle('background: #4CAF50'); // Generator color
    expect(bottomHandle).toHaveStyle('background: #4CAF50');
  });

  test('handles equipment with different types', () => {
    const transformerEquipment = new EquipmentBase('T-01', 'Test Transformer', 'Transformer');
    renderComponent(transformerEquipment);
    
    const topHandle = document.querySelector('[data-handleid="top"]');
    const bottomHandle = document.querySelector('[data-handleid="bottom"]');
    
    expect(topHandle).toHaveStyle('background: #FF9800'); // Transformer color
    expect(bottomHandle).toHaveStyle('background: #FF9800');
  });

  test('renders SVG icon with correct path', () => {
    renderComponent();
    
    const img = screen.getByAltText('Generator');
    expect(img).toHaveAttribute('src', '/icons/generator.svg');
  });

  test('handles SVG loading error gracefully', () => {
    renderComponent();
    
    const img = screen.getByAltText('Generator');
    
    // Simulate image load error
    fireEvent.error(img);
    
    // The image should be hidden and parent should have background color
    expect(img.style.display).toBe('none');
    expect(img.parentElement?.style.backgroundColor).toBeTruthy();
  });

  test('renders equipment with minimal text groups', () => {
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
      calculateEquipmentDimensions: jest.fn(() => ({ width: 120, height: 80 })),
      getTextGroups: jest.fn(() => mockMinimalTextGroups),
    }));

    renderComponent();
    
    // Should still render the main structure without text
    expect(document.querySelector('[data-handleid="top"]')).toBeInTheDocument();
    expect(document.querySelector('[data-handleid="bottom"]')).toBeInTheDocument();
  });
});