import "./globals_fixed.css";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata = {
    title: "GEO Analytics | Optimize for AI Search",
    description: "Improve your company's visibility in generative search results.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <LayoutWrapper>
                    {children}
                </LayoutWrapper>
            </body>
        </html>
    );
}
