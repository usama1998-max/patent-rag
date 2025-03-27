import { ReactNode } from "react";


interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Page Content */}
      <main className="flex-grow p-4">{children}</main>
    </div>
  );
};

export default MainLayout;
