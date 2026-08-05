import { ProviderNotReadyError } from "@minstrom/providers";
import { type NextFunction, type Request, type Response } from "express";
import { type ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Forespørselen mangler nødvendig informasjon eller har feil format."
        }
      });
      return;
    }

    request.body = result.data;
    next();
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ProviderNotReadyError) {
    response.status(503).json({
      error: {
        code: error.code,
        message:
          "Datakilden er ikke ferdig verifisert ennå. Vi må gjøre en kontrollert dataspike før ekte tokens tas imot."
      }
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Noe gikk galt. Prøv igjen senere."
    }
  });
}
