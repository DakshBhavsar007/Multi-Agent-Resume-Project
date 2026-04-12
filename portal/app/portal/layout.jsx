import Providers from "../../components/Providers";
import PortalClientLayout from "./PortalClientLayout";

export default function PortalLayout({ children }) {
  return (
    <Providers>
      <PortalClientLayout>
        {children}
      </PortalClientLayout>
    </Providers>
  );
}
