// Root App + router.

const initialRoute = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("4casters.route"));
    if (saved && saved.name) return saved;
  } catch {}
  return { name: "login" };
};

const App = () => {
  const [route, setRoute] = React.useState(initialRoute);

  React.useEffect(() => {
    localStorage.setItem("4casters.route", JSON.stringify(route));
    // scroll to top on route change
    window.scrollTo({ top: 0 });
  }, [route]);

  const go = (r) => setRoute(r);

  // Login is chromeless
  if (route.name === "login") return <Login go={go} />;

  let screen = null;
  if (route.name === "events")       screen = <EventsPage go={go} />;
  else if (route.name === "eventDetail") screen = <EventDetail slug={route.slug} go={go} />;
  else if (route.name === "sheet")   screen = <SheetViewer id={route.id} go={go} />;
  else if (route.name === "sheets")  screen = <MySheets go={go} />;
  else if (route.name === "saved")   screen = (
    <StubScreen
      title="Saved Players"
      message="You haven't saved any players yet. Star a player on any sheet to follow their stats across matches."
      action={<Btn variant="primary" size="md" onClick={() => go({ name: "events" })}>Browse events</Btn>}
    />
  );
  else if (route.name === "settings") screen = (
    <StubScreen
      title="Settings"
      message="Source credentials, export defaults, and billing live here."
      action={<Btn variant="outline" size="md" onClick={() => go({ name: "events" })}>Back to events</Btn>}
    />
  );
  else screen = <EventsPage go={go} />;

  return <Shell route={route} go={go}>{screen}</Shell>;
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
