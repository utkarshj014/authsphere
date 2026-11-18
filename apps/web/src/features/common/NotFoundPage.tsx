import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/index.js";
import { ROUTES } from "../../routes/routes.config.js";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-4 text-center">
        <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
          404 · Route Not Located
        </h1>
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          The requested interface route does not exist on this application
          control plane.
        </p>
        <div className="pt-2">
          <Link to={ROUTES.APP.ROOT} className="inline-block w-full">
            <Button variant="primary" className="w-full">
              Return to Control Plane
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
