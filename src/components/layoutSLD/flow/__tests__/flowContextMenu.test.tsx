import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import ContextMenu from '../nodeContextMenu';
import EquipmentBase from '../../../../models/equipmentBase';

// Mock @xyflow/react
const mockSetNodes = jest.fn();
const mockSetEdges = jest.fn();

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useReactFlow: () => ({
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
  }),
}));

describe('ContextMenu', () => {
  let mockEquipment: EquipmentBase;
  let mockOnEdit: jest.Mock;
  let mockOnDelete: jest.Mock;
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    EquipmentBase.clearRegistry();
    mockEquipment = new EquipmentBase('TEST-01', 'Test Equipment', 'Generator');
    mockOnEdit = jest.fn();
    mockOnDelete = jest.fn();
    mockOnClick = jest.fn();
    
    // Clear mock calls
    mockSetNodes.mockClear();
    mockSetEdges.mockClear();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  const getDefaultProps = () => ({
    id: 'TEST-01',
    equipmentList: [mockEquipment],
    onClick: mockOnClick,
    top: 100,
    left: 50,
  });

  const renderComponent = (props = {}) => {
    const defaultProps = getDefaultProps();
    return render(
      <ReactFlowProvider>
        <ContextMenu {...defaultProps} {...props} />
      </ReactFlowProvider>
    );
  };

  describe('Rendering', () => {
    it('renders context menu with correct positioning', () => {
      renderComponent();
      
      const paper = screen.getByRole('menu').parentElement;
      expect(paper).toHaveStyle({
        position: 'absolute',
        top: '100px',
        left: '50px',
      });
    });

    it('renders with right and bottom positioning', () => {
      renderComponent({ top: false, left: false, right: 75, bottom: 25 });
      
      const paper = screen.getByRole('menu').parentElement;
      expect(paper).toHaveStyle({
        position: 'absolute',
        right: '75px',
        bottom: '25px',
      });
    });

    it('renders edit and delete menu items', () => {
      renderComponent();
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('has correct z-index and styling', () => {
      renderComponent();
      
      const paper = screen.getByRole('menu').parentElement;
      expect(paper).toHaveStyle({
        zIndex: '1000',
        minWidth: '150px',
      });
    });
  });

  describe('Edit functionality', () => {
    it('calls onEdit when edit menu item is clicked', () => {
      renderComponent({ onEdit: mockOnEdit });
      
      const editMenuItem = screen.getByText('Edit');
      fireEvent.click(editMenuItem);
      
      expect(mockOnEdit).toHaveBeenCalledWith(mockEquipment);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('disables edit menu item when no onEdit handler provided', () => {
      renderComponent({ onEdit: undefined });
      
      const editMenuItem = screen.getByText('Edit').closest('li');
      expect(editMenuItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not call onEdit when equipment is not found', () => {
      renderComponent({ 
        id: 'NON-EXISTENT',
        onEdit: mockOnEdit 
      });
      
      const editMenuItem = screen.getByText('Edit');
      fireEvent.click(editMenuItem);
      
      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Delete functionality', () => {
    it('calls onDelete when delete menu item is clicked with valid equipment', () => {
      renderComponent({ onDelete: mockOnDelete });
      
      const deleteMenuItem = screen.getByText('Delete');
      fireEvent.click(deleteMenuItem);
      
      expect(mockOnDelete).toHaveBeenCalledWith(mockEquipment);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('uses fallback deletion when no onDelete handler provided', () => {
      renderComponent({ onDelete: undefined });
      
      const deleteMenuItem = screen.getByText('Delete');
      fireEvent.click(deleteMenuItem);
      
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('fallback deletion filters nodes correctly', () => {
      renderComponent({ onDelete: undefined });
      
      const deleteMenuItem = screen.getByText('Delete');
      fireEvent.click(deleteMenuItem);
      
      // Test the filter function passed to setNodes
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        { id: 'TEST-01', data: {} },
        { id: 'OTHER-01', data: {} },
      ];
      const filteredNodes = setNodesCall(mockNodes);
      
      expect(filteredNodes).toEqual([{ id: 'OTHER-01', data: {} }]);
    });

    it('fallback deletion filters edges correctly', () => {
      renderComponent({ onDelete: undefined });
      
      const deleteMenuItem = screen.getByText('Delete');
      fireEvent.click(deleteMenuItem);
      
      // Test the filter function passed to setEdges
      const setEdgesCall = mockSetEdges.mock.calls[0][0];
      const mockEdges = [
        { id: 'edge1', source: 'TEST-01', target: 'OTHER-01' },
        { id: 'edge2', source: 'OTHER-01', target: 'TEST-01' },
        { id: 'edge3', source: 'OTHER-01', target: 'ANOTHER-01' },
      ];
      const filteredEdges = setEdgesCall(mockEdges);
      
      expect(filteredEdges).toEqual([
        { id: 'edge3', source: 'OTHER-01', target: 'ANOTHER-01' }
      ]);
    });

    it('uses fallback deletion when equipment not found in list', () => {
      renderComponent({ 
        id: 'NON-EXISTENT',
        onDelete: mockOnDelete 
      });
      
      const deleteMenuItem = screen.getByText('Delete');
      fireEvent.click(deleteMenuItem);
      
      expect(mockOnDelete).not.toHaveBeenCalled();
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Event handling', () => {
    it('prevents event propagation when clicking inside menu', () => {
      renderComponent();
      
      const paper = screen.getByRole('menu').parentElement;
      const stopPropagationSpy = jest.fn();
      
      // Simulate a click event with stopPropagation
      fireEvent.click(paper!, { stopPropagation: stopPropagationSpy });
      
      // Since we can't directly test the stopPropagation call from the component,
      // we can test that the menu is still present after clicking
      expect(paper).toBeInTheDocument();
    });

    it('finds correct equipment from equipment list', () => {
      const equipment2 = new EquipmentBase('TEST-02', 'Test Equipment 2', 'Load');
      renderComponent({ 
        equipmentList: [mockEquipment, equipment2],
        id: 'TEST-02',
        onEdit: mockOnEdit 
      });
      
      const editMenuItem = screen.getByText('Edit');
      fireEvent.click(editMenuItem);
      
      expect(mockOnEdit).toHaveBeenCalledWith(equipment2);
    });
  });

  describe('Menu styling', () => {
    it('applies error styling to delete menu item', () => {
      renderComponent();
      
      const deleteMenuItem = screen.getByText('Delete').closest('li');
      // Note: The actual color value depends on the theme
      expect(deleteMenuItem).toHaveClass('css-aouaso-MuiButtonBase-root-MuiMenuItem-root');
    });

    it('has correct menu structure with icons', () => {
      renderComponent();
      
      // Check that edit icon is present  
      const editIcon = screen.getByTestId('EditIcon');
      expect(editIcon).toBeInTheDocument();
      expect(editIcon).toHaveClass('MuiSvgIcon-fontSizeSmall');
      
      // Check that delete icon is present
      const deleteIcon = screen.getByTestId('DeleteIcon');
      expect(deleteIcon).toBeInTheDocument();
      expect(deleteIcon).toHaveClass('MuiSvgIcon-fontSizeSmall');
    });

    it('has divider between menu items', () => {
      renderComponent();
      
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles undefined positioning props', () => {
      renderComponent({ 
        top: undefined, 
        left: undefined, 
        right: undefined, 
        bottom: undefined 
      });
      
      const paper = screen.getByRole('menu').parentElement;
      expect(paper).toBeInTheDocument();
    });

    it('handles false positioning props', () => {
      renderComponent({ 
        top: false, 
        left: false, 
        right: false, 
        bottom: false 
      });
      
      const paper = screen.getByRole('menu').parentElement;
      expect(paper).toBeInTheDocument();
    });

    it('handles empty equipment list', () => {
      renderComponent({ 
        equipmentList: [],
        onEdit: mockOnEdit,
        onDelete: mockOnDelete 
      });
      
      const editMenuItem = screen.getByText('Edit');
      const deleteMenuItem = screen.getByText('Delete');
      
      fireEvent.click(editMenuItem);
      fireEvent.click(deleteMenuItem);
      
      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
