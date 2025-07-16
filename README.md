# Single Line Diagram Generator

A web-based tool for creating and visualizing electrical single line diagrams. This application allows users to design electrical power system diagrams with various components including generators, transformers, loads, and protective devices.

## Features

- Interactive diagram builder with drag-and-drop functionality
- Library of standard electrical symbols and components
- Real-time diagram editing and visualization
- Export diagrams in multiple formats
- Responsive design for desktop and mobile use

## Usage

1. **Add Components**: Select electrical components from the component library
2. **Connect Elements**: Draw connections between components to create your circuit
3. **Configure Properties**: Set electrical properties and ratings for each component
4. **Export Diagram**: Save or export your completed single line diagram

## Live Demo

Access the app here: [Single Line Diagram Generator on GitHub Pages](https://nksherman.github.io/single-line-diagram/)

## Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/nksherman/single-line-diagram.git
   cd single-line-diagram
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173).

## Building for Production & Deployment

To create a production build for GitHub Pages or other static hosting:

```bash
npm run build
```

- The optimized static files will be output to the `dist/` directory.
- You can deploy the contents of the `dist/` folder to GitHub Pages, Netlify, Vercel, or any static web server.
- For GitHub Pages deployment, you can use the GitHub Actions workflow or upload the built files directly.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
