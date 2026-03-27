export default function ExpertiseLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      {children}
    </div>
  );
}
