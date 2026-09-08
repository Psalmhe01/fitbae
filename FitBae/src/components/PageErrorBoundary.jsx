import { Component } from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { ArrowLeft, RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("FitBae page failed to render", error, info.componentStack);
  }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Alert color="orange" title="This page couldn't open" role="alert" m="lg">
        <Stack gap="md">
          <Text size="sm">Try opening it again. If you've just received an app update, reload to get the latest version.</Text>
          <Group>
            <Button leftSection={<RefreshCw size={16} />} onClick={() => window.location.reload()}>Reload page</Button>
            <Button component={Link} to="/dashboard" variant="light" color="gray" leftSection={<ArrowLeft size={16} />}>Back to Today</Button>
          </Group>
        </Stack>
      </Alert>
    );
  }
}

export function PageErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}
