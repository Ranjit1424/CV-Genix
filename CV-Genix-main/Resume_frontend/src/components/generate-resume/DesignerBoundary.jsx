import React from "react";

class DesignerBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Designer crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error max-w-4xl w-full">
          <span>Designer failed to render: {this.state.message}</span>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DesignerBoundary;
