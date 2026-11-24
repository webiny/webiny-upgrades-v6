import React from "react";
import { Infra } from "webiny/extensions";
import { Api } from "webiny/extensions";

export const Extensions = () => {
  return (
    <>
      <Infra.Aws.DefaultRegion name={"eu-central-1"} />
      <Infra.Env.IsProd>
        <Api.Mailer.Smtp
          host={"smtp.example.com"}
          port={587}
          user={"smtp-user"}
          password={process.env.SMTP_PASSWORD || ""}
          from={"Webiny <no-reply@example.com>"}
        />
      </Infra.Env.IsProd>
    </>
  );
};
