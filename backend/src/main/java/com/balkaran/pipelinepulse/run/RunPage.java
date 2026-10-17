package com.balkaran.pipelinepulse.run;

import java.util.List;

public record RunPage(
        List<Run> items,
        String nextCursor
) {
}