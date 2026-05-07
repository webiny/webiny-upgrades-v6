export const Extensions = () => {
  return (
    <>
      <Infra.ProductionEnvironments environments={["prod", "production"]} />
      <ProjectAws />
      <Languages />
      <TenantManager />
      <AiPowerups />
    </>
  );
};
