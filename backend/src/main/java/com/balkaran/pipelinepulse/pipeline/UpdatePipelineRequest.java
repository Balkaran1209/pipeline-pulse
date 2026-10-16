package com.balkaran.pipelinepulse.pipeline;

import java.util.Map;
import java.util.Set;

import com.balkaran.pipelinepulse.common.InvalidRequestException;

public record UpdatePipelineRequest(String name, String product) {

    private static final Set<String> ALLOWED_FIELDS =
            Set.of("name", "product");

    private static final Set<String> ALLOWED_PRODUCTS =
            Set.of("flasharray", "flashblade", "hyperscale");

    public static UpdatePipelineRequest from(Map<String, Object> body) {
        if (body.isEmpty()) {
            throw new InvalidRequestException(
                    "Provide at least one field: name or product"
            );
        }

        if (!ALLOWED_FIELDS.containsAll(body.keySet())) {
            throw new InvalidRequestException(
                    "Only name and product can be updated"
            );
        }

        String name = readOptionalString(body, "name");
        String product = readOptionalString(body, "product");

        if (name != null && name.isBlank()) {
            throw new InvalidRequestException("name must not be blank");
        }

        if (product != null && !ALLOWED_PRODUCTS.contains(product)) {
            throw new InvalidRequestException(
                    "product must be flasharray, flashblade, or hyperscale"
            );
        }

        return new UpdatePipelineRequest(name, product);
    }

    private static String readOptionalString(
            Map<String, Object> body, String field
    ) {
        if (!body.containsKey(field)) {
            return null;
        }

        Object value = body.get(field);

        if (!(value instanceof String text)) {
            throw new InvalidRequestException(
                    field + " must be a string and must not be null"
            );
        }

        return text;
    }
}